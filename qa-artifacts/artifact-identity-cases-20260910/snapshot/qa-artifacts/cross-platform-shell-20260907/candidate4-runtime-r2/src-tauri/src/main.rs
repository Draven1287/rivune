use rivune_desktop::host::HostState;
use rivune_desktop::tray::{self, TrayActions, TrayStatus};
use serde::Serialize;
use std::collections::HashSet;
use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, State, WindowEvent};

/// Public startup status intentionally excludes loader errors, paths and saved bytes.
#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct StartupStatus {
    recovery_required: bool,
}

struct StartupWorkspace {
    status: StartupStatus,
    host: Option<Arc<HostState>>,
}

// A navigation hint, never workspace data: repeated activations coalesce until
// a subscribed renderer consumes it. Kept outside HostState for startup safety.
#[derive(Default)]
struct SettingsNavigation(std::sync::atomic::AtomicBool);

impl SettingsNavigation {
    fn request(&self, status: StartupStatus) -> std::io::Result<()> {
        if status.recovery_required {
            return Err(std::io::Error::new(std::io::ErrorKind::PermissionDenied, "Settings are unavailable while workspace recovery is required"));
        }
        self.0.store(true, Ordering::SeqCst);
        Ok(())
    }

    fn take(&self) -> bool {
        self.0.swap(false, Ordering::SeqCst)
    }
}

#[tauri::command]
fn take_pending_settings_request(navigation: State<'_, SettingsNavigation>) -> bool {
    navigation.take()
}

fn load_startup_profile(profile: PathBuf) -> StartupWorkspace {
    match HostState::open(profile) {
        Ok(host) => StartupWorkspace {
            status: StartupStatus { recovery_required: false },
            host: Some(Arc::new(host)),
        },
        Err(_) => StartupWorkspace {
            status: StartupStatus { recovery_required: true },
            host: None,
        },
    }
}

fn startup_shutdown_gate(status: StartupStatus) -> Arc<ShutdownGate> {
    let gate = ShutdownGate::default();
    gate.ready_to_exit.store(status.recovery_required, Ordering::SeqCst);
    Arc::new(gate)
}

fn require_recovery_exit(status: StartupStatus) -> Result<(), String> {
    if !status.recovery_required {
        return Err("Normal workspaces must complete the draft shutdown handshake.".into());
    }
    Ok(())
}

#[tauri::command]
fn get_startup_status(status: State<'_, StartupStatus>) -> StartupStatus {
    *status
}

#[tauri::command]
fn exit_recovery_workspace(app: AppHandle, status: State<'_, StartupStatus>) -> Result<(), String> {
    require_recovery_exit(*status)?;
    app.exit(0);
    Ok(())
}

#[derive(Default)]
struct ShutdownGate {
    request: Mutex<Option<String>>,
    recovered: Mutex<HashSet<String>>,
    sequence: AtomicU64,
    ready_to_exit: std::sync::atomic::AtomicBool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ShutdownDraftReceipt {
    state: String,
    token: String,
    #[serde(rename = "clientRevision")]
    client_revision: u64,
    #[serde(rename = "mutationID")]
    mutation_id: String,
    #[serde(rename = "conversationID")]
    conversation_id: Option<String>,
    #[serde(rename = "richDraftRevision")]
    rich_draft_revision: Option<u64>,
    #[serde(rename = "attachmentIDs")]
    attachment_ids: Vec<String>,
    selection: Option<rivune_desktop::host::ModelSelection>,
    team: Option<rivune_desktop::host::TeamSelection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn open_main<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let window = app.get_webview_window("main").ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "The Rivune window is unavailable",
        )
    })?;
    window.show()?;
    window.unminimize()?;
    window.set_focus()
}

fn reopen_existing_window(
    status: StartupStatus,
    gate: &ShutdownGate,
    restore_existing: impl FnOnce() -> tauri::Result<()>,
) -> tauri::Result<()> {
    // Recovery initializes this flag as permission to exit, not exit intent.
    // Only a healthy workspace uses it to signal completed shutdown.
    if !status.recovery_required && gate.ready_to_exit.load(Ordering::SeqCst) {
        return Ok(());
    }
    restore_existing()
}

fn open_settings<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    open_main(app)?;
    app.state::<SettingsNavigation>().request(*app.state::<StartupStatus>())?;
    app.emit("rivune://open-settings", ())
}

fn request_quit<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if app.state::<StartupStatus>().recovery_required {
        app.exit(0);
        return Ok(());
    }
    let gate = app.state::<Arc<ShutdownGate>>();
    let mut request = gate.request.lock().map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::Other, "Shutdown state is unavailable")
    })?;
    if let Some(token) = request.clone() {
        return app.emit("rivune://prepare-shutdown", token);
    }
    let token = format!(
        "shutdown-{}-{}",
        std::process::id(),
        gate.sequence.fetch_add(1, Ordering::SeqCst)
    );
    *request = Some(token.clone());
    if let Err(error) = app.emit("rivune://prepare-shutdown", token) {
        *request = None;
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
fn begin_shutdown(
    token: String,
    gate: State<'_, Arc<ShutdownGate>>,
    host: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    let current = gate
        .request
        .lock()
        .map_err(|_| "Shutdown state is unavailable.".to_owned())?;
    if current.as_deref() != Some(token.as_str()) {
        return Err("This shutdown request is no longer current.".into());
    }
    host.begin_shutdown()
}

#[tauri::command]
async fn complete_shutdown(
    token: String,
    app: AppHandle,
    gate: State<'_, Arc<ShutdownGate>>,
    host: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    {
        let current = gate
            .request
            .lock()
            .map_err(|_| "Shutdown state is unavailable.".to_owned())?;
        if current.as_deref() != Some(token.as_str()) {
            return Err("This shutdown request is no longer current.".into());
        }
    }
    let host = host.inner().clone();
    let result = match tauri::async_runtime::spawn_blocking(move || {
        host.prepare_shutdown(Duration::from_secs(12))
    })
    .await
    {
        Ok(result) => result,
        Err(error) => Err(format!(
            "The shutdown worker failed: {error}. The app remains open."
        )),
    };
    if let Err(error) = result {
        let _ = tray::set_status(&app, TrayStatus::NeedsAttention);
        return Err(error);
    }
    gate.ready_to_exit.store(true, Ordering::SeqCst);
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn flush_shutdown_draft(
    token: String,
    conversation_id: Option<String>,
    draft: String,
    client_revision: u64,
    expected_rich_revision: Option<u64>,
    mutation_id: String,
    attachment_ids: Vec<String>,
    selection: Option<rivune_desktop::host::ModelSelection>,
    team: Option<rivune_desktop::host::TeamSelection>,
    gate: State<'_, Arc<ShutdownGate>>,
    host: State<'_, Arc<HostState>>,
) -> Result<ShutdownDraftReceipt, String> {
    let current = gate
        .request
        .lock()
        .map_err(|_| "Shutdown state is unavailable.".to_owned())?;
    if current.as_deref() != Some(token.as_str()) {
        return Err("This shutdown request is no longer current.".into());
    }
    let Some(conversation_id) = conversation_id else {
        if !draft.is_empty()
            || !attachment_ids.is_empty()
            || expected_rich_revision.is_some()
            || selection.is_some()
            || team.is_some()
        {
            return Err("A shutdown draft without a conversation must be empty.".into());
        }
        return Ok(ShutdownDraftReceipt {
            state: "durable".into(),
            token,
            client_revision,
            mutation_id,
            conversation_id: None,
            rich_draft_revision: None,
            attachment_ids,
            selection: None,
            team: None,
            error: None,
        });
    };
    let expected_revision =
        expected_rich_revision.ok_or("A rich draft revision is required during shutdown.")?;
    let receipt = rivune_desktop::host::save_rich_draft_in(
        host.inner().as_ref(),
        rivune_desktop::host::SaveRichDraftRequest {
            conversation_id,
            mutation_id,
            expected_revision,
            draft,
            attachment_ids,
            selection,
            team,
        },
        true,
    )?;
    Ok(ShutdownDraftReceipt {
        state: receipt.state,
        token,
        client_revision,
        mutation_id: receipt.mutation_id,
        conversation_id: receipt.conversation_id,
        rich_draft_revision: receipt.revision,
        attachment_ids: receipt.attachment_ids,
        selection: receipt.selection,
        team: receipt.team,
        error: receipt.error,
    })
}

#[tauri::command]
fn pending_shutdown_request(gate: State<'_, Arc<ShutdownGate>>) -> Result<Option<String>, String> {
    gate.request
        .lock()
        .map(|current| current.clone())
        .map_err(|_| "Shutdown state is unavailable.".to_owned())
}

#[tauri::command]
fn abort_shutdown(
    token: String,
    app: AppHandle,
    gate: State<'_, Arc<ShutdownGate>>,
    host: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    abort_shutdown_state(&token, gate.inner().as_ref(), host.inner().as_ref())?;
    let _ = tray::set_status(&app, TrayStatus::NeedsAttention);
    Ok(())
}

fn abort_shutdown_state(token: &str, gate: &ShutdownGate, host: &HostState) -> Result<(), String> {
    let mut current = gate
        .request
        .lock()
        .map_err(|_| "Shutdown state is unavailable.".to_owned())?;
    if current.as_deref() != Some(token) {
        return if current.is_none()
            && gate
                .recovered
                .lock()
                .map_err(|_| "Shutdown recovery state is unavailable.".to_owned())?
                .contains(token)
        {
            Ok(())
        } else {
            Err("This shutdown request is no longer current.".into())
        };
    }
    host.recover_failed_shutdown()?;
    *current = None;
    let mut recovered = gate
        .recovered
        .lock()
        .map_err(|_| "Shutdown recovery state is unavailable.".to_owned())?;
    if recovered.len() >= 32 {
        recovered.clear();
    }
    recovered.insert(token.to_owned());
    Ok(())
}

fn resolved_profile_path(
    isolated_profile: Option<OsString>,
    default_profile: PathBuf,
) -> Result<PathBuf, String> {
    let Some(value) = isolated_profile else {
        return Ok(default_profile);
    };
    let profile = PathBuf::from(value);
    if !profile.is_absolute() {
        return Err("RIVUNE_ISOLATED_PROFILE_DIR must be absolute".into());
    }
    if profile == Path::new("/") {
        return Err("RIVUNE_ISOLATED_PROFILE_DIR cannot be the filesystem root".into());
    }
    let same_default = profile == default_profile
        || match (
            std::fs::canonicalize(&profile),
            std::fs::canonicalize(&default_profile),
        ) {
            (Ok(profile_identity), Ok(default_identity)) => profile_identity == default_identity,
            _ => false,
        }
        || {
            #[cfg(any(target_os = "macos", windows))]
            {
                profile
                    .to_string_lossy()
                    .eq_ignore_ascii_case(&default_profile.to_string_lossy())
            }
            #[cfg(not(any(target_os = "macos", windows)))]
            {
                false
            }
        };
    if same_default {
        return Err("RIVUNE_ISOLATED_PROFILE_DIR must not use the default Rivune profile".into());
    }
    let mut existing_path = PathBuf::new();
    for component in profile.components() {
        match component {
            Component::Prefix(_) | Component::RootDir | Component::Normal(_) => {
                existing_path.push(component)
            }
            _ => {
                return Err(
                    "RIVUNE_ISOLATED_PROFILE_DIR must not contain relative path components".into(),
                )
            }
        }
        if let Ok(metadata) = std::fs::symlink_metadata(&existing_path) {
            if metadata.file_type().is_symlink() {
                return Err("RIVUNE_ISOLATED_PROFILE_DIR must not traverse a symbolic link".into());
            }
            if !metadata.is_dir() {
                return Err("RIVUNE_ISOLATED_PROFILE_DIR must be a directory".into());
            }
        }
    }
    Ok(profile)
}

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let default_profile = app.path().app_data_dir()?.join("profile-v1");
            let profile = resolved_profile_path(
                std::env::var_os("RIVUNE_ISOLATED_PROFILE_DIR"),
                default_profile,
            )?;
            let startup = load_startup_profile(profile);
            let recovery_required = startup.status.recovery_required;
            app.manage(startup.status);
            app.manage(SettingsNavigation::default());
            app.manage(startup_shutdown_gate(startup.status));
            // In recovery mode no HostState is managed. Every existing command
            // requiring it remains unavailable, rather than opening an empty store.
            if let Some(host) = startup.host {
                app.manage(host);
            }
            let controller = tray::install(
                app.handle(),
                TrayActions {
                    open_main,
                    open_settings,
                    request_quit,
                },
            )?;
            controller.set_settings_available(!recovery_required)?;
            app.manage(controller);
            tray::set_status(app.handle(), if recovery_required { TrayStatus::NeedsAttention } else { TrayStatus::Idle })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_startup_status,
            take_pending_settings_request,
            exit_recovery_workspace,
            rivune_desktop::host::get_snapshot,
            rivune_desktop::host::configure_provider,
            rivune_desktop::host::reserve_provider_configuration,
            rivune_desktop::host::get_provider_configuration_operation,
            rivune_desktop::host::apply_provider_configuration,
            rivune_desktop::host::reconcile_provider_configuration,
            rivune_desktop::host::acknowledge_provider_configuration,

            rivune_desktop::host::discover_providers,
            rivune_desktop::host::get_model_catalog,
            rivune_desktop::host::discover_provider_models,
            rivune_desktop::host::cancel_model_discovery,
            rivune_desktop::host::refresh_model_catalog,
            rivune_desktop::host::create_project,
            rivune_desktop::host::update_project,
            rivune_desktop::host::select_project,
            rivune_desktop::host::move_conversation_to_project,
            rivune_desktop::host::search_workspace,
            rivune_desktop::host::create_conversation,
            rivune_desktop::host::open_conversation,
            rivune_desktop::host::save_draft,
            rivune_desktop::host::select_text_attachments,
            rivune_desktop::host::approve_text_attachment,
            rivune_desktop::host::inspect_text_attachment,
            rivune_desktop::host::inspect_artifact,
            rivune_desktop::host::save_rich_draft,
            rivune_desktop::host::validate_draft_attachments,
            rivune_desktop::host::preview_legacy_import,
            rivune_desktop::host::commit_legacy_import,
            rivune_desktop::host::recover_legacy_import,
            rivune_desktop::host::inspect_legacy_import,
            rivune_desktop::host::export_legacy_import,
            rivune_desktop::host::get_submission_recovery,
            rivune_desktop::host::reserve_submission_recovery,
            rivune_desktop::host::clear_submission_recovery,
            rivune_desktop::host::submit_reserved_run,
            rivune_desktop::host::submit_run,
            rivune_desktop::host::reconcile_run,
            rivune_desktop::host::cancel_run,
            rivune_desktop::host::retry_run,
            rivune_desktop::host::retry_constellation_invocation,
            pending_shutdown_request,
            begin_shutdown,
            flush_shutdown_draft,
            complete_shutdown,
            abort_shutdown
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Rivune desktop host");

    app.run(|app, event| match event {
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => {
            // Restore the existing authoritative window, including its recovery
            // surface. Do not navigate, create a window, or install another tray.
            if reopen_existing_window(
                *app.state::<StartupStatus>(),
                app.state::<Arc<ShutdownGate>>().as_ref(),
                || open_main(app),
            ).is_err() {
                let _ = tray::set_status(app, TrayStatus::NeedsAttention);
            }
        }
        RunEvent::WindowEvent {
            label,
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } if label == "main" => {
            api.prevent_close();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        RunEvent::ExitRequested { api, .. } => {
            if app
                .state::<Arc<ShutdownGate>>()
                .ready_to_exit
                .load(Ordering::SeqCst)
            {
                return;
            }
            api.prevent_exit();
            if request_quit(app).is_err() {
                let _ = tray::set_status(app, TrayStatus::NeedsAttention);
            }
        }
        _ => {}
    });
}

#[cfg(test)]
mod tests {
    #[test]
    fn dock_reopen_distinguishes_completed_shutdown_from_recovery_permission() {
        for (label, recovery, ready, pending, expected_calls) in [
            ("healthy", false, false, false, 1),
            ("pending-or-failed-shutdown", false, false, true, 1),
            ("completed-shutdown", false, true, true, 0),
            ("recovery", true, true, false, 1),
        ] {
            let status = StartupStatus { recovery_required: recovery };
            let gate = startup_shutdown_gate(status);
            gate.ready_to_exit.store(ready, Ordering::SeqCst);
            let request = pending.then(|| "pending-dock-test".to_owned());
            *gate.request.lock().unwrap() = request.clone();
            gate.recovered.lock().unwrap().insert("previous-token".into());
            gate.sequence.store(7, Ordering::SeqCst);
            let mut restore_calls = 0;
            reopen_existing_window(status, &gate, || { restore_calls += 1; Ok(()) }).unwrap();
            assert_eq!(restore_calls, expected_calls, "{label}");
            assert_eq!(*gate.request.lock().unwrap(), request, "{label}");
            assert_eq!(gate.ready_to_exit.load(Ordering::SeqCst), ready, "{label}");
            assert_eq!(gate.sequence.load(Ordering::SeqCst), 7, "{label}");
            assert_eq!(*gate.recovered.lock().unwrap(), HashSet::from(["previous-token".to_owned()]), "{label}");
        }
    }

    #[test]
    fn dock_reopen_repeats_only_existing_window_action_and_propagates_missing_window() {
        let status = StartupStatus { recovery_required: false };
        let gate = startup_shutdown_gate(status);
        let mut restore_calls = 0;
        for _ in 0..2 {
            reopen_existing_window(status, &gate, || { restore_calls += 1; Ok(()) }).unwrap();
        }
        assert_eq!(restore_calls, 2);
        let missing = reopen_existing_window(status, &gate, || {
            Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Existing main window missing").into())
        });
        assert!(missing.is_err());
        assert!(gate.request.lock().unwrap().is_none());
        assert!(!gate.ready_to_exit.load(Ordering::SeqCst));
    }

    #[test]
    fn delayed_settings_receiver_consumes_one_coalesced_request() {
        let navigation = super::SettingsNavigation::default();
        let ready = super::StartupStatus { recovery_required: false };
        navigation.request(ready).unwrap();
        navigation.request(ready).unwrap();
        assert!(navigation.take());
        assert!(!navigation.take());
        navigation.request(ready).unwrap();
        assert!(navigation.take());
    }

    #[test]
    fn recovery_settings_request_is_rejected_without_pending_navigation() {
        let navigation = super::SettingsNavigation::default();
        assert!(navigation.request(super::StartupStatus { recovery_required: true }).is_err());
        assert!(!navigation.take());
    }
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn host(name: &str) -> (Arc<HostState>, std::path::PathBuf) {
        let path = std::env::temp_dir().join(format!(
            "rivune-main-{name}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        (Arc::new(HostState::open(path.clone()).unwrap()), path)
    }

    fn startup_profile_bytes(root: &Path) -> std::collections::BTreeMap<PathBuf, Vec<u8>> {
        fn visit(root: &Path, directory: &Path, result: &mut std::collections::BTreeMap<PathBuf, Vec<u8>>) {
            for entry in std::fs::read_dir(directory).unwrap() {
                let entry = entry.unwrap();
                let path = entry.path();
                if entry.file_type().unwrap().is_dir() {
                    visit(root, &path, result);
                } else {
                    result.insert(path.strip_prefix(root).unwrap().to_path_buf(), std::fs::read(path).unwrap());
                }
            }
        }
        let mut result = std::collections::BTreeMap::new();
        visit(root, root, &mut result);
        result
    }

    #[test]
    fn startup_corrupt_latest_profile_returns_no_host_and_preserves_every_file_byte() {
        // Keep the older valid snapshot too: corruption must not silently fall
        // back to it, replace the latest file or create a new empty workspace.
        let (initial_host, path) = host("startup-corrupt");
        drop(initial_host);
        let corrupt = path.join("snapshots/workspace-v1-00000000000000000002.json");
        std::fs::write(&corrupt, b"{corrupt synthetic saved data: PRIVATE_TEST_MARKER").unwrap();
        let before = startup_profile_bytes(&path);
        let startup = load_startup_profile(path.clone());
        assert!(startup.status.recovery_required);
        assert!(startup.host.is_none(), "recovery setup has no HostState to manage");
        assert_eq!(startup_profile_bytes(&path), before);
        let public = serde_json::to_value(startup.status).unwrap();
        assert_eq!(public, serde_json::json!({"recoveryRequired": true}));
        assert!(!public.to_string().contains("PRIVATE_TEST_MARKER"));
        assert!(!public.to_string().contains(path.to_string_lossy().as_ref()));
        assert!(startup_shutdown_gate(startup.status).ready_to_exit.load(Ordering::SeqCst));
        assert!(require_recovery_exit(startup.status).is_ok());
        drop(startup);
        std::fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn startup_valid_profile_supplies_host_and_preserves_normal_shutdown_gate() {
        let (initial_host, path) = host("startup-normal");
        drop(initial_host);
        let before = startup_profile_bytes(&path);
        let startup = load_startup_profile(path.clone());
        assert!(!startup.status.recovery_required);
        assert!(startup.host.is_some(), "normal setup must manage the loaded host");
        assert_eq!(startup_profile_bytes(&path), before);
        assert_eq!(serde_json::to_value(startup.status).unwrap(), serde_json::json!({"recoveryRequired": false}));
        let gate = startup_shutdown_gate(startup.status);
        assert!(!gate.ready_to_exit.load(Ordering::SeqCst));
        assert!(gate.request.lock().unwrap().is_none());
        assert!(require_recovery_exit(startup.status).is_err(), "recovery exit cannot bypass a normal workspace's draft handshake");
        assert!(!gate.ready_to_exit.load(Ordering::SeqCst));
        drop(startup);
        std::fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn startup_unreadable_saved_recovery_state_does_not_expose_or_replace_host() {
        let (initial_host, path) = host("startup-invalid-recovery");
        drop(initial_host);
        let snapshots = path.join("snapshots");
        let existing = std::fs::read_dir(&snapshots).unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|entry| entry.extension().and_then(|value| value.to_str()) == Some("json"))
            .unwrap();
        let mut value: serde_json::Value = serde_json::from_slice(&std::fs::read(existing).unwrap()).unwrap();
        value["submissionRecovery"] = serde_json::json!({
            "schemaVersion": 1, "requestID": "corrupt-intent", "conversationID": "welcome", "state": "unsupported"
        });
        std::fs::write(snapshots.join("workspace-v1-00000000000000000002.json"), serde_json::to_vec(&value).unwrap()).unwrap();
        let before = startup_profile_bytes(&path);
        let startup = load_startup_profile(path.clone());
        assert!(startup.status.recovery_required);
        assert!(startup.host.is_none());
        assert_eq!(startup_profile_bytes(&path), before);
        drop(startup);
        std::fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn profile_path_uses_default_only_when_isolated_value_is_absent() {
        let default = std::env::temp_dir().join("rivune-default-profile");
        assert_eq!(
            resolved_profile_path(None, default.clone()).unwrap(),
            default
        );
    }

    #[test]
    fn profile_path_accepts_explicit_absolute_isolated_directory() {
        let default = std::env::temp_dir().join("rivune-default-profile");
        #[cfg(unix)]
        let isolated = PathBuf::from("/private/tmp/rivune-explicit-isolated-profile");
        #[cfg(not(unix))]
        let isolated = std::env::current_dir()
            .unwrap()
            .join("rivune-explicit-isolated-profile");
        assert_eq!(
            resolved_profile_path(Some(isolated.clone().into_os_string()), default).unwrap(),
            isolated
        );
    }

    #[test]
    fn profile_path_supplied_invalid_value_never_falls_back_to_default() {
        let default = std::env::temp_dir().join("rivune-default-profile");
        assert!(
            resolved_profile_path(Some(OsString::from("relative-profile")), default.clone())
                .unwrap_err()
                .contains("must be absolute")
        );
        assert!(
            resolved_profile_path(Some(OsString::from("/")), default.clone())
                .unwrap_err()
                .contains("filesystem root")
        );
        assert!(resolved_profile_path(
            Some(OsString::from("/private/tmp/../tmp/rivune-isolated")),
            default.clone()
        )
        .unwrap_err()
        .contains("relative path components"));
        assert!(
            resolved_profile_path(Some(default.clone().into_os_string()), default)
                .unwrap_err()
                .contains("must not use the default")
        );
    }

    #[cfg(any(target_os = "macos", windows))]
    #[test]
    fn profile_path_rejects_case_alias_of_default_profile() {
        #[cfg(target_os = "macos")]
        let default = PathBuf::from("/private/tmp/Rivune-QA/profile-v1");
        #[cfg(target_os = "macos")]
        let alias = PathBuf::from("/PRIVATE/TMP/RIVUNE-QA/PROFILE-V1");
        #[cfg(windows)]
        let default = PathBuf::from(r"C:\Rivune-QA\profile-v1");
        #[cfg(windows)]
        let alias = PathBuf::from(r"c:\RIVUNE-QA\PROFILE-V1");
        assert!(resolved_profile_path(Some(alias.into_os_string()), default)
            .unwrap_err()
            .contains("must not use the default"));
    }

    #[cfg(unix)]
    #[test]
    fn profile_path_rejects_existing_symlink_and_regular_file() {
        use std::os::unix::fs::symlink;

        let root = PathBuf::from("/private/tmp").join(format!(
            "rivune-main-profile-guard-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let default = root.join("default");
        let target = root.join("target");
        let link = root.join("link");
        let through_link = link.join("nested-profile");
        let file = root.join("file");
        std::fs::create_dir_all(&target).unwrap();
        symlink(&target, &link).unwrap();
        std::fs::write(&file, b"not a profile directory").unwrap();

        assert!(
            resolved_profile_path(Some(through_link.into_os_string()), default.clone())
                .unwrap_err()
                .contains("traverse a symbolic link")
        );
        assert!(resolved_profile_path(Some(file.into_os_string()), default)
            .unwrap_err()
            .contains("must be a directory"));
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn abort_replays_same_recovered_token_after_lost_ack() {
        let (host, path) = host("abort-replay");
        let gate = ShutdownGate::default();
        *gate.request.lock().unwrap() = Some("token-a".into());
        host.begin_shutdown().unwrap();
        abort_shutdown_state("token-a", &gate, &host).unwrap();
        assert!(gate.request.lock().unwrap().is_none());
        abort_shutdown_state("token-a", &gate, &host).unwrap();
        std::fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn recovered_old_token_cannot_cancel_or_acknowledge_a_new_shutdown() {
        let (host, path) = host("abort-stale");
        let gate = ShutdownGate::default();
        *gate.request.lock().unwrap() = Some("token-a".into());
        host.begin_shutdown().unwrap();
        abort_shutdown_state("token-a", &gate, &host).unwrap();
        *gate.request.lock().unwrap() = Some("token-b".into());
        host.begin_shutdown().unwrap();
        assert!(abort_shutdown_state("token-a", &gate, &host).is_err());
        assert_eq!(gate.request.lock().unwrap().as_deref(), Some("token-b"));
        abort_shutdown_state("token-b", &gate, &host).unwrap();
        std::fs::remove_dir_all(path).unwrap();
    }
}
