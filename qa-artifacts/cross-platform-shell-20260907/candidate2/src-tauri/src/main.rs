fn main() {
    tauri::Builder::default()
        // No commands are registered in this spike. A production host must expose
        // the versioned Rivune workspace contract and own all provider dispatch.
        .run(tauri::generate_context!())
        .expect("failed to run Rivune desktop shell spike");
}
