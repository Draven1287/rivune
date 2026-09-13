use rivune_desktop::host::HostState;
use rivune_desktop::tray::{self, TrayActions, TrayStatus};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, State, WindowEvent};
use uuid::Uuid;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewAction {
    schema_version: u32,
    #[serde(rename = "actionID")]
    action_id: String,
    #[serde(rename = "recoveryScopeID")]
    recovery_scope_id: String,
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

fn open_settings<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    open_main(app)?;
    app.emit("rivune://open-settings", ())
}

fn new_review_action_id() -> String {
    Uuid::new_v4().to_string()
}

fn open_review<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    open_main(app)?;
    let recovery_scope_id = app.state::<Arc<HostState>>().recovery_scope_id();
    let action_id = new_review_action_id();
    app.emit("rivune://open-review", ReviewAction {
        schema_version: 1,
        action_id,
        recovery_scope_id,
    })
}

fn request_quit<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
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
        if !draft.is_empty() || !attachment_ids.is_empty() || expected_rich_revision.is_some() {
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

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let profile = match std::env::var_os("RIVUNE_ISOLATED_PROFILE_DIR") {
                Some(value) if cfg!(debug_assertions) => {
                    let path = std::path::PathBuf::from(value);
                    if !path.is_absolute() {
                        return Err("RIVUNE_ISOLATED_PROFILE_DIR must be absolute".into());
                    }
                    path
                }
                Some(_) => return Err("RIVUNE_ISOLATED_PROFILE_DIR is development-only".into()),
                None => app.path().app_data_dir()?.join("profile-v1"),
            };
            app.manage(Arc::new(HostState::open(profile)?));
            app.manage(Arc::new(ShutdownGate::default()));
            let controller = tray::install(
                app.handle(),
                TrayActions {
                    open_main,
                    open_review,
                    open_settings,
                    request_quit,
                },
            )?;
            app.manage(controller);
            tray::set_status(app.handle(), TrayStatus::Idle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            rivune_desktop::host::get_snapshot,
            rivune_desktop::host::get_recovery_scope_id,
            rivune_desktop::host::configure_provider,
            rivune_desktop::host::discover_providers,
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
            rivune_desktop::host::save_rich_draft,
            rivune_desktop::host::validate_draft_attachments,
            rivune_desktop::host::preview_legacy_import,
            rivune_desktop::host::commit_legacy_import,
            rivune_desktop::host::recover_legacy_import,
            rivune_desktop::host::inspect_legacy_import,
            rivune_desktop::host::export_legacy_import,
            rivune_desktop::host::submit_run,
            rivune_desktop::host::reconcile_run,
            rivune_desktop::host::cancel_run,
            rivune_desktop::host::retry_run,
            pending_shutdown_request,
            begin_shutdown,
            flush_shutdown_draft,
            complete_shutdown,
            abort_shutdown
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Rivune desktop host");

    app.run(|app, event| match event {
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

    #[test]
    fn review_action_ids_are_unique_ascii_and_fit_the_draft_mutation_limit() {
        let first = new_review_action_id();
        let second = new_review_action_id();
        assert_ne!(first, second);
        assert!(first.is_ascii());
        assert!(format!("review:{first}").len() <= 128);
    }
}
