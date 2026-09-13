use rivune_desktop::host::HostState;
use std::sync::Arc;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            rivune_desktop::host::get_snapshot,
            rivune_desktop::host::configure_provider,
            rivune_desktop::host::create_conversation,
            rivune_desktop::host::open_conversation,
            rivune_desktop::host::save_draft,
            rivune_desktop::host::submit_run,
            rivune_desktop::host::reconcile_run,
            rivune_desktop::host::cancel_run,
            rivune_desktop::host::retry_run
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Rivune desktop host");
}
