use serde::Serialize;
use std::{path::PathBuf, process::{Command, Stdio}, time::{Duration, Instant}};

#[derive(Serialize)]
struct Connection { name: String, state: String }

fn executable(name: &str) -> Option<PathBuf> {
    let mut dirs: Vec<PathBuf> = std::env::var_os("PATH").map(|p| std::env::split_paths(&p).collect()).unwrap_or_default();
    if let Some(home) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(home).join(".local/bin"));
    }
    dirs.extend([PathBuf::from("/opt/homebrew/bin"), PathBuf::from("/usr/local/bin")]);
    dirs.into_iter().map(|dir| dir.join(name)).find(|path| path.is_file())
}

// Fixed, local authentication checks only. Never starts inference or reads credentials.
fn check(name: &str, binary: &str, args: &[&str]) -> Connection {
    let state = match executable(binary) {
        None => "Not installed",
        Some(_) if args.is_empty() => "Installed · sign-in not checked",
        Some(path) => {
            let child = Command::new(path).args(args).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn();
            match child {
                Err(_) => "Could not check",
                Ok(mut child) => {
                    let start = Instant::now();
                    loop {
                        match child.try_wait() {
                            Ok(Some(status)) => break if status.success() { "Signed in · reply not tested" } else { "Sign-in needed" },
                            Err(_) => { let _ = child.kill(); let _ = child.wait(); break "Could not check"; },
                            Ok(None) if start.elapsed() > Duration::from_secs(8) => { let _ = child.kill(); let _ = child.wait(); break "Check timed out"; },
                            _ => std::thread::sleep(Duration::from_millis(50)),
                        }
                    }
                }
            }
        }
    };
    Connection { name: name.into(), state: state.into() }
}

#[tauri::command]
async fn check_connections() -> Result<Vec<Connection>, String> {
    if std::env::consts::OS != "macos" {
        return Err("Connection checks are not yet supported on this operating system".into());
    }
    tauri::async_runtime::spawn_blocking(|| vec![
        check("Codex", "codex", &["login", "status"]),
        check("Claude", "claude", &["auth", "status"]),
        check("Gemini", "gemini", &[]),
        if PathBuf::from("/Applications/Antigravity.app").is_dir() {
            Connection { name: "Antigravity".into(), state: "Desktop app installed · adapter planned".into() }
        } else { check("Antigravity", "antigravity", &[]) },
        Connection { name: "Grok".into(), state: "No supported CLI adapter".into() },
    ]).await.map_err(|_| "Connection check could not finish".into())
}

#[derive(Serialize)]
struct RuntimeInfo { os: &'static str }

#[tauri::command]
fn runtime_info() -> RuntimeInfo { RuntimeInfo { os: std::env::consts::OS } }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if app.config().plugins.0.contains_key("updater") {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![check_connections, runtime_info])
        .run(tauri::generate_context!())
        .expect("error while running Rivune");
}
