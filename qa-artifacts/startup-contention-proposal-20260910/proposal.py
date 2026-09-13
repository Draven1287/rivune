"""Print isolated unified patch proposal; never write candidate files. No build."""
from pathlib import Path
import hashlib
import difflib

root = Path(__file__).resolve().parents[2] / 'tools/symphony/source-import-candidate'
prefix = 'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/'
base = {'main.rs': 'b5dc504c4f85b1a07876f9e0228cc146a25889f3918184d9dcc7f2bb5b6de061', 'host.rs': 'f336d930ade7a0f1a6fc7b5cc370f9b49c67d94f03c9de2593c93c6bfd4f0a7e'}
def replace(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)

for name, digest in base.items():
    path = prefix + name
    old = (root / path).read_text()
    assert hashlib.sha256(old.encode()).hexdigest() == digest, 'Base changed: ' + name
    new = old
    if name == 'host.rs':
        new = replace(new, 'impl HostState {', '''#[derive(Debug)]
pub struct ProfileInUse;
impl std::fmt::Display for ProfileInUse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("This Rivune profile is already open.")
    }
}
impl std::error::Error for ProfileInUse {}

fn classify_profile_lock(error: std::io::Error) -> Box<dyn std::error::Error> {
    if error.raw_os_error() == fs2::lock_contended_error().raw_os_error() {
        Box::new(ProfileInUse)
    } else {
        Box::new(error)
    }
}

#[cfg(test)]
mod contention_classification_tests {
    use super::*;
    #[test]
    fn only_contention_is_profile_in_use() {
        assert!(classify_profile_lock(fs2::lock_contended_error()).is::<ProfileInUse>());
        assert!(!classify_profile_lock(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied, "denied")).is::<ProfileInUse>());
    }
}

impl HostState {''')
        new = replace(new, '.map_err(|_| "this Rivune profile is already open in another process")?', '.map_err(classify_profile_lock)?')
    else:
        new = replace(new, 'fn load_startup_profile(profile: PathBuf) -> StartupWorkspace {', '''fn load_startup_profile(profile: PathBuf) -> Result<StartupWorkspace, rivune_desktop::host::ProfileInUse> {
    classify_startup(HostState::open(profile))
}

fn classify_startup(result: Result<HostState, Box<dyn std::error::Error>>) -> Result<StartupWorkspace, rivune_desktop::host::ProfileInUse> {''')
        new = replace(new, '    match HostState::open(profile) {', '    Ok(match result {')
        new = replace(new, '        Err(_) => StartupWorkspace {', '        Err(error) if error.is::<rivune_desktop::host::ProfileInUse>() => return Err(rivune_desktop::host::ProfileInUse),\n        Err(_) => StartupWorkspace {')
        new = replace(new, '            host: None,\n        },\n    }\n}', '            host: None,\n        },\n    })\n}')
        new = new.replace('load_startup_profile(path.clone());', 'load_startup_profile(path.clone()).unwrap();')
        new = replace(new, 'fn main() {\n    let app', '''fn main() {
    let mut context = tauri::generate_context!();
    // Defer automatic windows even when QA overrides replace window config.
    for window in &mut context.config_mut().app.windows { window.create = false; }
    let app''')
        new = replace(new, 'let startup = load_startup_profile(profile);', 'let startup = load_startup_profile(profile)?;')
        new = replace(new, '            let controller = tray::install(', '''            let config = app.config().app.windows.first().ok_or("Missing main window configuration")?;
            tauri::WebviewWindowBuilder::from_config(app, config)?.build()?;
            let controller = tray::install(''')
        new = replace(new, '''        .build(tauri::generate_context!())
        .expect("failed to build Rivune desktop host");''', '''        .build(context);
    let app = match app {
        Ok(app) => app,
        Err(error) => {
            // Setup contention returns before any window/tray; no event loop.
            eprintln!("Rivune startup stopped: {error}");
            return;
        }
    };''')
    print(''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='a/'+path, tofile='b/'+path)), end='')
