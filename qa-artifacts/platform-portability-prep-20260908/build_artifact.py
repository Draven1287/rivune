from pathlib import Path
import difflib
import hashlib

ROOT = Path(__file__).resolve().parents[2]
SOURCE_REL = Path("qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs")
SOURCE = ROOT / SOURCE_REL
OUT = Path(__file__).resolve().parent
EXPECTED_SOURCE_SHA256 = "e942af4a13457debf9285b1a8c42aaefe6a978a8cd3dbf1d8c9e994a27c7caf2"

source_bytes = SOURCE.read_bytes()
actual_source_sha256 = hashlib.sha256(source_bytes).hexdigest()
if actual_source_sha256 != EXPECTED_SOURCE_SHA256:
    raise SystemExit(
        "source hash changed; refuse to rewrite reviewed patch: "
        f"expected {EXPECTED_SOURCE_SHA256}, got {actual_source_sha256}"
    )
old = source_bytes.decode()
old_function = """fn discover_provider_executables(directories: &[PathBuf]) -> Vec<(ProviderKind, PathBuf)> {
    let mut found = Vec::new();
    for (kind, name) in [
        (ProviderKind::Codex, "codex"),
        (ProviderKind::Claude, "claude"),
    ] {
        for directory in directories {
            let filename = if cfg!(windows) {
                format!("{name}.exe")
            } else {
                name.to_owned()
            };
            let path = directory.join(filename);
            if !path.is_file() {
                continue;
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if fs::metadata(&path)
                    .map(|metadata| metadata.permissions().mode() & 0o111 == 0)
                    .unwrap_or(true)
                {
                    continue;
                }
            }
            found.push((kind.clone(), path));
            break;
        }
    }
    found
}
"""

new_function = """#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ProviderDiscoveryPlatform {
    Posix,
    Windows,
}

fn provider_candidate_filenames(
    name: &str,
    platform: ProviderDiscoveryPlatform,
) -> Vec<String> {
    match platform {
        ProviderDiscoveryPlatform::Posix => vec![name.to_owned()],
        ProviderDiscoveryPlatform::Windows => {
            vec![format!("{name}.exe"), format!("{name}.com")]
        }
    }
}

fn discover_provider_executables_for_platform(
    directories: &[PathBuf],
    platform: ProviderDiscoveryPlatform,
) -> Vec<(ProviderKind, PathBuf)> {
    let mut found = Vec::new();
    for (kind, name) in [
        (ProviderKind::Codex, "codex"),
        (ProviderKind::Claude, "claude"),
    ] {
        let filenames = provider_candidate_filenames(name, platform);
        'directories: for directory in directories {
            for filename in &filenames {
                let path = directory.join(filename);
                if !path.is_file() {
                    continue;
                }
                #[cfg(unix)]
                if platform == ProviderDiscoveryPlatform::Posix {
                    use std::os::unix::fs::PermissionsExt;
                    if fs::metadata(&path)
                        .map(|metadata| metadata.permissions().mode() & 0o111 == 0)
                        .unwrap_or(true)
                    {
                        continue;
                    }
                }
                found.push((kind.clone(), path));
                break 'directories;
            }
        }
    }
    found
}

fn discover_provider_executables(directories: &[PathBuf]) -> Vec<(ProviderKind, PathBuf)> {
    let platform = if cfg!(windows) {
        ProviderDiscoveryPlatform::Windows
    } else {
        ProviderDiscoveryPlatform::Posix
    };
    discover_provider_executables_for_platform(directories, platform)
}
"""

old_test = """    #[test]
    fn active_conversation_persists_and_missing_ids_fall_back_safely() {
"""
new_tests = """    #[test]
    fn windows_provider_discovery_accepts_com_without_admitting_wrappers() {
        let directory = profile("provider discovery with spaces");
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("codex.com"), b"not executed").unwrap();
        fs::write(directory.join("claude.cmd"), b"not executed").unwrap();
        fs::write(directory.join("claude.bat"), b"not executed").unwrap();
        fs::write(directory.join("claude.ps1"), b"not executed").unwrap();

        let found = discover_provider_executables_for_platform(
            std::slice::from_ref(&directory),
            ProviderDiscoveryPlatform::Windows,
        );

        assert_eq!(found, vec![(ProviderKind::Codex, directory.join("codex.com"))]);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn windows_provider_discovery_preserves_path_order_then_prefers_exe() {
        let first = profile("provider-discovery-windows-first");
        let second = profile("provider-discovery-windows-second");
        fs::create_dir_all(&first).unwrap();
        fs::create_dir_all(&second).unwrap();
        fs::write(first.join("codex.com"), b"not executed").unwrap();
        fs::write(second.join("codex.exe"), b"not executed").unwrap();
        fs::write(first.join("claude.com"), b"not executed").unwrap();
        fs::write(first.join("claude.exe"), b"not executed").unwrap();

        let found = discover_provider_executables_for_platform(
            &[first.clone(), second.clone()],
            ProviderDiscoveryPlatform::Windows,
        );

        assert_eq!(found[0], (ProviderKind::Codex, first.join("codex.com")));
        assert_eq!(found[1], (ProviderKind::Claude, first.join("claude.exe")));
        fs::remove_dir_all(first).unwrap();
        fs::remove_dir_all(second).unwrap();
    }

    #[test]
    fn active_conversation_persists_and_missing_ids_fall_back_safely() {
"""

if old_function not in old:
    raise SystemExit("source discovery function did not match expected input")
if old_test not in old:
    raise SystemExit("test insertion point did not match expected input")
new = old.replace(old_function, new_function, 1).replace(old_test, new_tests, 1)

patch = "".join(difflib.unified_diff(
    old.splitlines(keepends=True),
    new.splitlines(keepends=True),
    fromfile=f"a/{SOURCE_REL}",
    tofile=f"b/{SOURCE_REL}",
))
(OUT / "HOST_RS.patch").write_text(patch)
