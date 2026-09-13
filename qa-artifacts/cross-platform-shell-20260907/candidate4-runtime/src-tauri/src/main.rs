mod host;

use host::{
    cancel_run, configure_provider, create_conversation, get_snapshot, open_conversation,
    reconcile_run, retry_run, save_draft, submit_run, HostState,
};
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
            get_snapshot,
            configure_provider,
            create_conversation,
            open_conversation,
            save_draft,
            submit_run,
            reconcile_run,
            cancel_run,
            retry_run
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Rivune desktop host");
}
