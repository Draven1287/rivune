use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

pub const MAX_ATTACHMENT_BYTES: usize = 65_536;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct SourceIdentity {
    pub device: u64,
    pub inode: u64,
    pub modified_ns: i128,
    pub length: u64,
}

#[derive(Clone, Debug)]
pub struct CapturedTextFile {
    pub path: PathBuf,
    pub display_name: String,
    pub bytes: Vec<u8>,
    pub text: String,
    pub sha256: String,
    pub identity: SourceIdentity,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionIssue {
    pub display_name: String,
    pub code: String,
}

#[cfg(unix)]
fn open_regular_nofollow_with_hook(
    path: &Path,
    before_leaf_open: impl FnOnce(),
) -> Result<File, String> {
    use std::ffi::CString;
    use std::os::fd::{AsRawFd, FromRawFd};
    use std::os::unix::ffi::OsStrExt;
    use std::path::Component;

    if !path.is_absolute() {
        return Err("INVALID_SOURCE".into());
    }
    let components = path
        .components()
        .filter_map(|component| match component {
            Component::RootDir => None,
            Component::Normal(value) => Some(value),
            _ => Some(std::ffi::OsStr::new("")),
        })
        .collect::<Vec<_>>();
    if components.is_empty() || components.iter().any(|value| value.is_empty()) {
        return Err("INVALID_SOURCE".into());
    }

    let root = CString::new("/").expect("root path has no NUL");
    let root_fd = unsafe {
        libc::open(
            root.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_CLOEXEC,
        )
    };
    if root_fd < 0 {
        return Err("SOURCE_UNREADABLE".into());
    }
    let mut directory = unsafe { File::from_raw_fd(root_fd) };
    for component in &components[..components.len() - 1] {
        let name = CString::new(component.as_bytes()).map_err(|_| "INVALID_SOURCE")?;
        let fd = unsafe {
            libc::openat(
                directory.as_raw_fd(),
                name.as_ptr(),
                libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
            )
        };
        if fd < 0 {
            return Err(match std::io::Error::last_os_error().raw_os_error() {
                Some(libc::ELOOP) | Some(libc::ENOTDIR) => "SYMLINK_REJECTED".into(),
                Some(libc::ENOENT) => "SOURCE_MISSING".into(),
                _ => "SOURCE_UNREADABLE".into(),
            });
        }
        directory = unsafe { File::from_raw_fd(fd) };
    }

    before_leaf_open();
    let leaf = CString::new(components.last().unwrap().as_bytes()).map_err(|_| "INVALID_SOURCE")?;
    let fd = unsafe {
        libc::openat(
            directory.as_raw_fd(),
            leaf.as_ptr(),
            libc::O_RDONLY | libc::O_NOFOLLOW | libc::O_CLOEXEC | libc::O_NONBLOCK,
        )
    };
    if fd < 0 {
        return Err(match std::io::Error::last_os_error().raw_os_error() {
            Some(libc::ELOOP) => "SYMLINK_REJECTED".into(),
            Some(libc::ENOENT) => "SOURCE_MISSING".into(),
            _ => "SOURCE_UNREADABLE".into(),
        });
    }
    Ok(unsafe { File::from_raw_fd(fd) })
}

#[cfg(not(unix))]
fn open_regular_nofollow_with_hook(
    path: &Path,
    before_leaf_open: impl FnOnce(),
) -> Result<File, String> {
    if !path.is_absolute() {
        return Err("INVALID_SOURCE".into());
    }
    before_leaf_open();
    File::open(path).map_err(|_| "SOURCE_MISSING".into())
}

#[cfg(unix)]
fn identity(metadata: &fs::Metadata) -> SourceIdentity {
    use std::os::unix::fs::MetadataExt;
    SourceIdentity {
        device: metadata.dev(),
        inode: metadata.ino(),
        modified_ns: i128::from(metadata.mtime()) * 1_000_000_000
            + i128::from(metadata.mtime_nsec()),
        length: metadata.len(),
    }
}

#[cfg(not(unix))]
fn identity(metadata: &fs::Metadata) -> SourceIdentity {
    let modified_ns = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|value| value.as_nanos() as i128)
        .unwrap_or_default();
    SourceIdentity {
        device: 0,
        inode: 0,
        modified_ns,
        length: metadata.len(),
    }
}

fn capture_text_file_with_hook(
    path: &Path,
    before_leaf_open: impl FnOnce(),
) -> Result<CapturedTextFile, String> {
    let display_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .ok_or("INVALID_NAME")?
        .to_owned();
    if display_name.len() > 256 {
        return Err("NAME_TOO_LONG".into());
    }
    let mut file = open_regular_nofollow_with_hook(path, before_leaf_open)?;
    let before = file.metadata().map_err(|_| "SOURCE_MISSING")?;
    if !before.is_file() {
        return Err("NOT_REGULAR_FILE".into());
    }
    let before_identity = identity(&before);
    if before_identity.length == 0 {
        return Err("EMPTY_FILE".into());
    }
    if before_identity.length > MAX_ATTACHMENT_BYTES as u64 {
        return Err("FILE_TOO_LARGE".into());
    }
    let mut bytes = Vec::with_capacity(before_identity.length as usize);
    file.by_ref()
        .take((MAX_ATTACHMENT_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| "SOURCE_UNREADABLE")?;
    if bytes.len() > MAX_ATTACHMENT_BYTES {
        return Err("FILE_TOO_LARGE".into());
    }
    let after = file.metadata().map_err(|_| "SOURCE_CHANGED")?;
    let path_after = fs::symlink_metadata(path).map_err(|_| "SOURCE_MISSING")?;
    if path_after.file_type().is_symlink()
        || identity(&after) != before_identity
        || identity(&path_after) != before_identity
    {
        return Err("SOURCE_CHANGED".into());
    }
    if bytes.contains(&0) {
        return Err("INVALID_TEXT".into());
    }
    let text = String::from_utf8(bytes.clone()).map_err(|_| "INVALID_TEXT")?;
    let sha256 = format!("{:x}", Sha256::digest(&bytes));
    Ok(CapturedTextFile {
        path: path.to_path_buf(),
        display_name,
        bytes,
        text,
        sha256,
        identity: before_identity,
    })
}

pub fn capture_text_file(path: &Path) -> Result<CapturedTextFile, String> {
    capture_text_file_with_hook(path, || {})
}

pub fn revalidate_text_file(
    path: &Path,
    expected: &SourceIdentity,
    sha256: &str,
) -> Result<(), String> {
    let captured = match capture_text_file(path) {
        Ok(value) => value,
        Err(code) if code == "SOURCE_MISSING" || code == "SYMLINK_REJECTED" => return Err(code),
        Err(_) => return Err("SOURCE_CHANGED".into()),
    };
    if &captured.identity != expected || captured.sha256 != sha256 {
        return Err("SOURCE_CHANGED".into());
    }
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn choose_text_files(app: &AppHandle) -> Result<Option<Vec<PathBuf>>, String> {
    use objc2::rc::autoreleasepool;
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSModalResponseOK, NSOpenPanel};
    use objc2_foundation::NSString;
    use std::sync::mpsc;

    let (sender, receiver) = mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let result = autoreleasepool(|_| {
            let mtm = MainThreadMarker::new()
                .ok_or("The attachment dialog could not reach AppKit's main thread.")?;
            let panel = NSOpenPanel::openPanel(mtm);
            panel.setCanChooseFiles(true);
            panel.setCanChooseDirectories(false);
            panel.setAllowsMultipleSelection(true);
            panel.setResolvesAliases(false);
            panel.setTitle(Some(&NSString::from_str("Choose text files to include")));
            panel.setPrompt(Some(&NSString::from_str("Choose")));
            if panel.runModal() != NSModalResponseOK {
                return Ok(None);
            }
            let paths = panel
                .URLs()
                .iter()
                .filter_map(|url| url.path())
                .map(|path| PathBuf::from(path.to_string()))
                .collect::<Vec<_>>();
            Ok::<_, String>(Some(paths))
        });
        let _ = sender.send(result);
    })
    .map_err(|error| format!("The attachment dialog could not be opened: {error}"))?;
    receiver
        .recv()
        .map_err(|_| "The attachment dialog closed without a result.".to_owned())?
}

#[cfg(not(target_os = "macos"))]
pub fn choose_text_files(_app: &AppHandle) -> Result<Option<Vec<PathBuf>>, String> {
    Err("Secure attachment selection is not available on this platform build.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp(name: &str) -> PathBuf {
        std::env::temp_dir().canonicalize().unwrap().join(format!(
            "rivune-attachment-{name}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn captures_exact_utf8_bytes() {
        let path = temp("utf8");
        fs::write(&path, "hello ☃\n").unwrap();
        let captured = capture_text_file(&path).unwrap();
        assert_eq!(captured.bytes, fs::read(&path).unwrap());
        assert_eq!(captured.text, "hello ☃\n");
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_empty_nul_invalid_and_oversize() {
        for (name, bytes, code) in [
            ("empty", vec![], "EMPTY_FILE"),
            ("nul", b"hello\0world".to_vec(), "INVALID_TEXT"),
            ("invalid", vec![0xff, 0xfe], "INVALID_TEXT"),
            (
                "large",
                vec![b'x'; MAX_ATTACHMENT_BYTES + 1],
                "FILE_TOO_LARGE",
            ),
        ] {
            let path = temp(name);
            fs::write(&path, bytes).unwrap();
            assert_eq!(capture_text_file(&path).unwrap_err(), code);
            fs::remove_file(path).unwrap();
        }
    }

    #[cfg(unix)]
    #[test]
    fn rejects_leaf_and_parent_symlinks() {
        use std::os::unix::fs::symlink;
        let directory = temp("links");
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("brief.txt"), "brief").unwrap();
        symlink(directory.join("brief.txt"), directory.join("leaf.txt")).unwrap();
        assert_eq!(
            capture_text_file(&directory.join("leaf.txt")).unwrap_err(),
            "SYMLINK_REJECTED"
        );
        let alias = temp("alias");
        symlink(&directory, &alias).unwrap();
        assert_eq!(
            capture_text_file(&alias.join("brief.txt")).unwrap_err(),
            "SYMLINK_REJECTED"
        );
        fs::remove_file(alias).unwrap();
        fs::remove_dir_all(directory).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn fifo_is_rejected_without_blocking() {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;
        use std::time::{Duration, Instant};

        let path = temp("fifo");
        let encoded = CString::new(path.as_os_str().as_bytes()).unwrap();
        assert_eq!(unsafe { libc::mkfifo(encoded.as_ptr(), 0o600) }, 0);
        let started = Instant::now();
        assert_eq!(capture_text_file(&path).unwrap_err(), "NOT_REGULAR_FILE");
        assert!(started.elapsed() < Duration::from_secs(1));
        fs::remove_file(path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn swapped_parent_is_never_followed_for_leaf_open() {
        use std::os::unix::fs::symlink;

        let root = temp("parent-swap");
        let chosen = root.join("chosen");
        let moved = root.join("chosen-original");
        let secret = root.join("secret");
        fs::create_dir_all(&chosen).unwrap();
        fs::create_dir_all(&secret).unwrap();
        fs::write(chosen.join("brief.txt"), "approved bytes").unwrap();
        fs::write(secret.join("brief.txt"), "must never be captured").unwrap();

        let result = capture_text_file_with_hook(&chosen.join("brief.txt"), || {
            fs::rename(&chosen, &moved).unwrap();
            symlink(&secret, &chosen).unwrap();
        });
        assert_eq!(result.unwrap_err(), "SOURCE_CHANGED");

        fs::remove_file(chosen).unwrap();
        fs::remove_dir_all(root).unwrap();
    }
}
