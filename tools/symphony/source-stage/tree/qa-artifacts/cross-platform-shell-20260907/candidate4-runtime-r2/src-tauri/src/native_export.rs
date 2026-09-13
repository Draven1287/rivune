use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedFileReceipt {
    pub filename: String,
    pub sha256: String,
    pub bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeExportReceipt {
    pub platform: &'static str,
    pub saved: Vec<ExportedFileReceipt>,
    pub cancelled: bool,
    pub error: Option<String>,
    pub uncertain_filename: Option<String>,
}

#[cfg(target_os = "macos")]
mod macos {
    use super::{ExportedFileReceipt, NativeExportReceipt};
    use objc2::rc::autoreleasepool;
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSModalResponseOK, NSSavePanel};
    use objc2_foundation::NSString;
    use sha2::{Digest, Sha256};
    use std::fs::{self, File, OpenOptions};
    use std::io::{Read, Write};
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::mpsc;
    use tauri::AppHandle;

    static NONCE: AtomicU64 = AtomicU64::new(0);

    #[derive(Debug)]
    struct ExportWriteFailure {
        message: String,
        filename: String,
        published: bool,
    }

    #[cfg(test)]
    fn verified_write(destination: &Path, bytes: &[u8]) -> Result<ExportedFileReceipt, String> {
        verified_write_with_nonce(destination, bytes, NONCE.fetch_add(1, Ordering::SeqCst))
            .map_err(|failure| failure.message)
    }

    fn verified_write_with_nonce(
        destination: &Path,
        bytes: &[u8],
        nonce: u64,
    ) -> Result<ExportedFileReceipt, ExportWriteFailure> {
        let fallback_filename = destination
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("selected export")
            .to_owned();
        let fail = |message: String| ExportWriteFailure {
            message,
            filename: fallback_filename.clone(),
            published: false,
        };
        if !destination.is_absolute() {
            return Err(fail(
                "The native save panel returned an invalid destination.".into(),
            ));
        }
        let filename = destination
            .file_name()
            .and_then(|value| value.to_str())
            .filter(|value| !value.is_empty() && *value != "." && *value != "..")
            .ok_or_else(|| fail("The selected export filename is invalid.".into()))?
            .to_owned();
        let parent = destination
            .parent()
            .ok_or_else(|| fail("The selected export folder is invalid.".into()))?
            .canonicalize()
            .map_err(|_| fail("The selected export folder is unavailable.".into()))?;
        let destination = parent.join(&filename);
        if let Ok(metadata) = fs::symlink_metadata(&destination) {
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err(ExportWriteFailure {
                    message: "Rivune will not replace a link or non-file destination.".into(),
                    filename,
                    published: false,
                });
            }
        }
        let temporary = parent.join(format!(
            ".rivune-export-{}-{}.tmp",
            std::process::id(),
            nonce
        ));
        let mut owns_temporary = false;
        let mut published = false;
        let result = (|| {
            let mut options = OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.mode(0o600);
            }
            let mut file = options
                .open(&temporary)
                .map_err(|error| ExportWriteFailure {
                    message: format!("The export staging file could not be created: {error}"),
                    filename: filename.clone(),
                    published: false,
                })?;
            owns_temporary = true;
            file.write_all(bytes)
                .and_then(|_| file.sync_all())
                .map_err(|error| ExportWriteFailure {
                    message: format!("The export staging file could not be saved: {error}"),
                    filename: filename.clone(),
                    published: false,
                })?;
            fs::rename(&temporary, &destination).map_err(|error| ExportWriteFailure {
                message: format!("The confirmed export could not be published: {error}"),
                filename: filename.clone(),
                published: false,
            })?;
            owns_temporary = false;
            published = true;
            File::open(&parent)
                .and_then(|directory| directory.sync_all())
                .map_err(|error| ExportWriteFailure {
                    message: format!("The export folder could not be synchronized: {error}"),
                    filename: filename.clone(),
                    published: true,
                })?;
            let mut confirmed = File::open(&destination).map_err(|error| ExportWriteFailure {
                message: format!("The exported file could not be read back: {error}"),
                filename: filename.clone(),
                published: true,
            })?;
            let mut hasher = Sha256::new();
            let mut confirmed_len = 0usize;
            let mut buffer = [0u8; 64 * 1024];
            loop {
                let read = confirmed
                    .read(&mut buffer)
                    .map_err(|error| ExportWriteFailure {
                        message: format!("The exported file could not be read back: {error}"),
                        filename: filename.clone(),
                        published: true,
                    })?;
                if read == 0 {
                    break;
                }
                confirmed_len = confirmed_len.saturating_add(read);
                if confirmed_len > bytes.len() {
                    return Err(ExportWriteFailure {
                        message: "The exported file did not pass read-back verification.".into(),
                        filename: filename.clone(),
                        published: true,
                    });
                }
                hasher.update(&buffer[..read]);
            }
            let expected = Sha256::digest(bytes);
            let actual = hasher.finalize();
            if expected != actual || confirmed_len != bytes.len() {
                return Err(ExportWriteFailure {
                    message: "The exported file did not pass read-back verification.".into(),
                    filename: filename.clone(),
                    published: true,
                });
            }
            Ok(ExportedFileReceipt {
                filename: filename.clone(),
                sha256: format!("{actual:x}"),
                bytes: confirmed_len,
            })
        })();
        if result.is_err() && owns_temporary {
            let _ = fs::remove_file(&temporary);
        }
        result.map_err(|mut failure| {
            failure.published |= published;
            failure
        })
    }

    fn choose_destination(app: &AppHandle, filename: String) -> Result<Option<PathBuf>, String> {
        let (sender, receiver) = mpsc::sync_channel(1);
        app.run_on_main_thread(move || {
            let result = autoreleasepool(|_| {
                let mtm = MainThreadMarker::new()
                    .ok_or("The native export dialog could not reach AppKit's main thread.")?;
                let panel = NSSavePanel::savePanel(mtm);
                panel.setCanCreateDirectories(true);
                panel.setTitle(Some(&NSString::from_str(
                    "Export a verified Rivune original",
                )));
                panel.setPrompt(Some(&NSString::from_str("Export")));
                panel.setNameFieldStringValue(&NSString::from_str(&filename));
                if panel.runModal() != NSModalResponseOK {
                    return Ok(None);
                }
                let path = panel
                    .URL()
                    .and_then(|url| url.path())
                    .map(|path| PathBuf::from(path.to_string()))
                    .ok_or("The native save panel did not return a file destination.")?;
                Ok::<_, String>(Some(path))
            });
            let _ = sender.send(result);
        })
        .map_err(|error| format!("The native export dialog could not be opened: {error}"))?;
        receiver
            .recv()
            .map_err(|_| String::from("The native export dialog closed without a result."))?
    }

    pub fn export_files(
        app: &AppHandle,
        files: Vec<(String, Vec<u8>)>,
    ) -> Result<NativeExportReceipt, String> {
        let mut saved = Vec::new();
        for (filename, bytes) in files {
            let selected = match choose_destination(app, filename.clone()) {
                Ok(selected) => selected,
                Err(error) => {
                    return Ok(NativeExportReceipt {
                        platform: "macOS",
                        saved,
                        cancelled: false,
                        error: Some(error),
                        uncertain_filename: None,
                    });
                }
            };
            let Some(destination) = selected else {
                return Ok(NativeExportReceipt {
                    platform: "macOS",
                    saved,
                    cancelled: true,
                    error: None,
                    uncertain_filename: None,
                });
            };
            match verified_write_with_nonce(
                &destination,
                &bytes,
                NONCE.fetch_add(1, Ordering::SeqCst),
            ) {
                Ok(receipt) => saved.push(receipt),
                Err(failure) => {
                    return Ok(NativeExportReceipt {
                        platform: "macOS",
                        saved,
                        cancelled: false,
                        error: Some(failure.message),
                        uncertain_filename: failure.published.then_some(failure.filename),
                    });
                }
            }
        }
        Ok(NativeExportReceipt {
            platform: "macOS",
            saved,
            cancelled: false,
            error: None,
            uncertain_filename: None,
        })
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::os::unix::fs::symlink;

        fn directory(label: &str) -> PathBuf {
            let path = std::env::temp_dir().join(format!(
                "rivune-native-export-{label}-{}-{}",
                std::process::id(),
                NONCE.fetch_add(1, Ordering::SeqCst)
            ));
            fs::create_dir(&path).unwrap();
            path
        }

        #[test]
        fn atomic_export_is_read_back_and_hash_verified() {
            let parent = directory("verified");
            let destination = parent.join("original.json");
            let receipt = verified_write(&destination, br#"{"safe":true}"#).unwrap();
            assert_eq!(receipt.filename, "original.json");
            assert_eq!(receipt.bytes, 13);
            assert_eq!(receipt.sha256.len(), 64);
            assert_eq!(fs::read(&destination).unwrap(), br#"{"safe":true}"#);
            assert!(!fs::read_dir(&parent)
                .unwrap()
                .filter_map(Result::ok)
                .any(|entry| entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".rivune-export-")));
            fs::remove_dir_all(parent).unwrap();
        }

        #[test]
        fn export_never_follows_a_destination_symlink() {
            let parent = directory("symlink");
            let target = parent.join("target.json");
            let destination = parent.join("original.json");
            fs::write(&target, b"untouched").unwrap();
            symlink(&target, &destination).unwrap();
            assert!(verified_write(&destination, b"replacement")
                .unwrap_err()
                .contains("will not replace a link"));
            assert_eq!(fs::read(&target).unwrap(), b"untouched");
            fs::remove_dir_all(parent).unwrap();
        }

        #[test]
        fn staging_collision_preserves_the_unowned_file() {
            let parent = directory("collision");
            let destination = parent.join("original.json");
            let nonce = NONCE.fetch_add(1, Ordering::SeqCst);
            let collision =
                parent.join(format!(".rivune-export-{}-{nonce}.tmp", std::process::id()));
            fs::write(&collision, b"belongs to someone else").unwrap();

            let failure = verified_write_with_nonce(&destination, b"replacement", nonce)
                .expect_err("create_new must reject the occupied staging name");

            assert!(!failure.published);
            assert_eq!(fs::read(&collision).unwrap(), b"belongs to someone else");
            assert!(!destination.exists());
            fs::remove_dir_all(parent).unwrap();
        }
    }
}

#[cfg(target_os = "macos")]
pub use macos::export_files;

#[cfg(not(target_os = "macos"))]
pub fn export_files(
    _app: &tauri::AppHandle,
    _files: Vec<(String, Vec<u8>)>,
) -> Result<NativeExportReceipt, String> {
    Err("Verified native export is available on macOS only in this development build.".into())
}
