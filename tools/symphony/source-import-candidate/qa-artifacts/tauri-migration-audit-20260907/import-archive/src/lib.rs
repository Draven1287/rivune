//! Host-side immutable archive transactions. No provider, credential or run API.
//! The caller owns explicit selection/confirmation and a private profile parent.
use rivune_legacy_import_preview::{preview_import, ImportPreview, LegacySource, SourceKind};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const SOURCE_LIMIT: u64 = 32 * 1024 * 1024;
const TOTAL_LIMIT: u64 = 64 * 1024 * 1024;
const RECORD_LIMIT: u64 = 65 * 1024 * 1024;
static NONCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, PartialEq, Eq)]
pub enum ArchiveError { Io(io::ErrorKind), Busy, UnsafePath, InvalidSelection, BindingMismatch, CorruptArchive, CommitUncertain, InjectedFailure }
impl From<io::Error> for ArchiveError { fn from(e: io::Error) -> Self { Self::Io(e.kind()) } }
type Result<T> = std::result::Result<T, ArchiveError>;

/// Immutable host-owned inputs; rebuilt from original bytes, not public preview fields.
pub struct PreparedImport { preview: ImportPreview }
impl PreparedImport {
    pub fn from_reviewed(sources: Vec<LegacySource>, reviewed_fingerprint: &str) -> Result<Self> {
        let preview = preview_import(sources);
        if !preview.reviewable() { return Err(ArchiveError::InvalidSelection); }
        if preview.summary.fingerprint != reviewed_fingerprint { return Err(ArchiveError::BindingMismatch); }
        Ok(Self { preview })
    }
    pub fn fingerprint(&self) -> &str { &self.preview.summary.fingerprint }
}

#[derive(Debug, PartialEq, Eq)]
pub enum CommitOutcome { Created, AlreadyPresent }
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SyncScope { FilesAndDirectories, FilesOnly }
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AccessScope { UnixOwnerOnlyModes, InheritedAclNotVerified }
/// Scope of successful OS sync requests, not a hardware power-loss guarantee.
#[derive(Debug, PartialEq, Eq)]
pub struct CommitReceipt { pub outcome: CommitOutcome, pub sync_scope: SyncScope, pub access_scope: AccessScope }
#[derive(Debug)]
pub struct Inventory { pub committed: Vec<String>, pub incomplete_stages: usize }
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Checkpoint { StageCreated, PayloadWritten(usize), ManifestWritten, StageSynced, Published, ParentSynced }

/// Holds a stable OS lock for its lifetime. Never unlink the lock file.
/// Root must be a private directory in a host-owned parent; no user path strings
/// are used for payload names. Cooperating processes must use this API.
pub struct ArchiveStore { root: PathBuf, _lock: File }
impl ArchiveStore {
    pub fn open(root: &Path) -> Result<Self> {
        if !root.is_absolute() || root.parent().is_none() || root.components().any(|c| matches!(c, Component::ParentDir)) {
            return Err(ArchiveError::UnsafePath);
        }
        if !exists(root)? { private_dir(root)?; }
        checked_metadata(root, true)?;
        let lock_path = root.join("archive.lock");
        if exists(&lock_path)? { checked_metadata(&lock_path, false)?; }
        let mut options = OpenOptions::new(); options.read(true).write(true).create(true);
        #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
        let lock = options.open(&lock_path)?;
        checked_metadata(&lock_path, false)?;
        match lock.try_lock() { Ok(()) => {}, Err(TryLockError::WouldBlock) => return Err(ArchiveError::Busy), Err(TryLockError::Error(e)) => return Err(e.into()) }
        sync_dir(root)?;
        // Also covers a prior interruption immediately after creating root.
        sync_dir(root.parent().ok_or(ArchiveError::UnsafePath)?)?;
        Ok(Self { root: root.to_owned(), _lock: lock })
    }

    pub fn inventory(&self) -> Result<Inventory> {
        let mut committed = Vec::new(); let mut incomplete_stages = 0;
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?; let name = entry.file_name().into_string().map_err(|_| ArchiveError::UnsafePath)?;
            if name == "archive.lock" { continue; }
            checked_metadata(&entry.path(), true)?;
            if valid_fingerprint(&name) { self.load(&name)?; committed.push(name); }
            else if name.starts_with(".stage-") { incomplete_stages += 1; }
            else { return Err(ArchiveError::CorruptArchive); }
        }
        committed.sort(); Ok(Inventory { committed, incomplete_stages })
    }

    /// Returns inert raw records after revalidating the entire committed archive.
    pub fn load(&self, fingerprint: &str) -> Result<ImportPreview> {
        if !valid_fingerprint(fingerprint) { return Err(ArchiveError::UnsafePath); }
        validate_archive(&self.root.join(fingerprint), fingerprint)
    }

    pub fn commit(&mut self, prepared: &PreparedImport) -> Result<CommitReceipt> {
        self.commit_inner(prepared, |_| Ok(()))
    }

    #[cfg(feature = "fault-injection")]
    pub fn commit_with_faults(&mut self, prepared: &PreparedImport, hook: impl FnMut(Checkpoint) -> Result<()>) -> Result<CommitReceipt> {
        self.commit_inner(prepared, hook)
    }

    fn commit_inner(&mut self, prepared: &PreparedImport, mut hook: impl FnMut(Checkpoint) -> Result<()>) -> Result<CommitReceipt> {
        let fingerprint = prepared.fingerprint();
        let destination = self.root.join(fingerprint);
        if exists(&destination)? {
            self.load(fingerprint)?;
            // A prior process may have died after rename but before parent sync.
            sync_dir(&self.root).map_err(|_| ArchiveError::CommitUncertain)?;
            return Ok(self.receipt(CommitOutcome::AlreadyPresent));
        }
        let payload = payloads(&prepared.preview)?;
        let manifest = make_manifest(fingerprint, &payload);
        let stage = self.create_stage()?;
        hook(Checkpoint::StageCreated)?;
        for (index, (name, bytes)) in payload.iter().enumerate() {
            write_new(&stage.join(name), bytes)?;
            hook(Checkpoint::PayloadWritten(index))?;
        }
        write_new(&stage.join("manifest.json"), &serde_json::to_vec(&manifest).map_err(|_| ArchiveError::CorruptArchive)?)?;
        hook(Checkpoint::ManifestWritten)?;
        validate_archive(&stage, fingerprint)?;
        sync_dir(&stage)?;
        hook(Checkpoint::StageSynced)?;
        // The exclusive lock protects the absence check across cooperating writers.
        // Any pre-existing destination, even malformed, is never replaced.
        if exists(&destination)? { return Err(ArchiveError::CorruptArchive); }
        fs::rename(&stage, &destination)?;
        hook(Checkpoint::Published).map_err(|_| ArchiveError::CommitUncertain)?;
        sync_dir(&self.root).map_err(|_| ArchiveError::CommitUncertain)?;
        hook(Checkpoint::ParentSynced).map_err(|_| ArchiveError::CommitUncertain)?;
        Ok(self.receipt(CommitOutcome::Created))
    }

    fn receipt(&self, outcome: CommitOutcome) -> CommitReceipt {
        CommitReceipt { outcome,
            sync_scope: if cfg!(unix) { SyncScope::FilesAndDirectories } else { SyncScope::FilesOnly },
            access_scope: if cfg!(unix) { AccessScope::UnixOwnerOnlyModes } else { AccessScope::InheritedAclNotVerified },
        }
    }

    fn create_stage(&self) -> Result<PathBuf> {
        for _ in 0..32 {
            let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| ArchiveError::UnsafePath)?.as_nanos();
            let name = format!(".stage-{}-{stamp}-{}", std::process::id(), NONCE.fetch_add(1, Ordering::Relaxed));
            let path = self.root.join(name);
            match private_dir(&path) { Ok(()) => return Ok(path), Err(ArchiveError::Io(io::ErrorKind::AlreadyExists)) => continue, Err(e) => return Err(e) }
        }
        Err(ArchiveError::Busy)
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct Entry { name: String, bytes: u64, sha256: String }
#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct Manifest { schema_version: u32, fingerprint: String, files: Vec<Entry> }
#[derive(Serialize)]
struct Records<'a> {
    schema_version: u32, execution_policy: &'static str,
    conversations: Vec<Box<RawValue>>, projects: Vec<Box<RawValue>>,
    drafts: BTreeMap<&'a str, Box<RawValue>>, selected_conversation_id: &'a Option<String>,
    preferences: &'a Option<Box<RawValue>>,
}
fn payloads(preview: &ImportPreview) -> Result<BTreeMap<String, Vec<u8>>> {
    let mut files = BTreeMap::new();
    for source in &preview.originals { files.insert(source_name(source.kind).into(), source.bytes.clone()); }
    let raw = |value: &str| RawValue::from_string(value.to_owned()).map_err(|_| ArchiveError::CorruptArchive);
    let records = Records {
        schema_version: 1, execution_policy: "inert-no-dispatch",
        conversations: preview.conversations.iter().map(|r| raw(r.raw_json())).collect::<Result<_>>()?,
        projects: preview.projects.iter().map(|r| raw(r.raw_json())).collect::<Result<_>>()?,
        drafts: preview.drafts.iter().map(|(k,r)| Ok((k.as_str(),raw(r.raw_json())?))).collect::<Result<_>>()?,
        selected_conversation_id: &preview.selected_conversation_id, preferences: &preview.preferences,
    };
    files.insert("records.json".into(), serde_json::to_vec(&records).map_err(|_| ArchiveError::CorruptArchive)?);
    Ok(files)
}
fn make_manifest(fingerprint: &str, payload: &BTreeMap<String, Vec<u8>>) -> Manifest {
    Manifest { schema_version: 1, fingerprint: fingerprint.into(), files: payload.iter().map(|(name, bytes)| Entry { name: name.clone(), bytes: bytes.len() as u64, sha256: hash(bytes) }).collect() }
}
fn validate_archive(path: &Path, fingerprint: &str) -> Result<ImportPreview> {
    checked_metadata(path, true)?;
    let manifest: Manifest = serde_json::from_slice(&read_bounded(&path.join("manifest.json"), 65536)?).map_err(|_| ArchiveError::CorruptArchive)?;
    if manifest.schema_version != 1 || manifest.fingerprint != fingerprint || manifest.files.len() > 6 { return Err(ArchiveError::CorruptArchive); }
    let mut actual_names = BTreeSet::new();
    for entry in fs::read_dir(path)? { let entry = entry?; checked_metadata(&entry.path(), false)?; actual_names.insert(entry.file_name().into_string().map_err(|_| ArchiveError::UnsafePath)?); }
    let mut expected_names = BTreeSet::from(["manifest.json".to_owned()]);
    let mut originals = Vec::new(); let mut total = 0u64;
    for entry in &manifest.files {
        let kind = source_kind(&entry.name);
        if kind.is_none() && entry.name != "records.json" { return Err(ArchiveError::CorruptArchive); }
        if !expected_names.insert(entry.name.clone()) { return Err(ArchiveError::CorruptArchive); }
        let limit = if kind.is_some() { SOURCE_LIMIT } else { RECORD_LIMIT };
        if entry.bytes > limit { return Err(ArchiveError::CorruptArchive); }
        let bytes = read_bounded(&path.join(&entry.name), entry.bytes)?;
        if bytes.len() as u64 != entry.bytes || hash(&bytes) != entry.sha256 { return Err(ArchiveError::CorruptArchive); }
        if let Some(kind) = kind {
            total = total.checked_add(entry.bytes).ok_or(ArchiveError::CorruptArchive)?;
            if total > TOTAL_LIMIT { return Err(ArchiveError::CorruptArchive); }
            originals.push(LegacySource { kind, bytes });
        }
    }
    if expected_names != actual_names || !expected_names.contains("records.json") { return Err(ArchiveError::CorruptArchive); }
    let preview = preview_import(originals);
    if !preview.reviewable() || preview.summary.fingerprint != fingerprint { return Err(ArchiveError::CorruptArchive); }
    if make_manifest(fingerprint, &payloads(&preview)?) != manifest { return Err(ArchiveError::CorruptArchive); }
    Ok(preview)
}
fn source_name(kind: SourceKind) -> &'static str {
    match kind { SourceKind::History => "history.json", SourceKind::HistoryBackup => "history-backup.json", SourceKind::Projects => "projects.json", SourceKind::Drafts => "drafts.json", SourceKind::Preferences => "preferences.json" }
}
fn source_kind(name: &str) -> Option<SourceKind> {
    [SourceKind::History,SourceKind::HistoryBackup,SourceKind::Projects,SourceKind::Drafts,SourceKind::Preferences].into_iter().find(|kind| source_name(*kind) == name)
}
fn hash(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
fn valid_fingerprint(value: &str) -> bool { value.len() == 64 && value.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) }
fn exists(path: &Path) -> Result<bool> {
    match fs::symlink_metadata(path) { Ok(_) => Ok(true), Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(false), Err(e) => Err(e.into()) }
}
fn checked_metadata(path: &Path, directory: bool) -> Result<fs::Metadata> {
    let metadata = fs::symlink_metadata(path)?;
    if metadata.file_type().is_symlink() || (directory && !metadata.is_dir()) || (!directory && !metadata.is_file()) { return Err(ArchiveError::UnsafePath); }
    #[cfg(unix)] {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if metadata.permissions().mode() & 0o077 != 0 || (!directory && metadata.nlink() != 1) { return Err(ArchiveError::UnsafePath); }
    }
    Ok(metadata)
}
fn private_dir(path: &Path) -> Result<()> {
    let mut builder = fs::DirBuilder::new();
    #[cfg(unix)] { use std::os::unix::fs::DirBuilderExt; builder.mode(0o700); }
    builder.create(path)?; Ok(())
}
fn write_new(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut options = OpenOptions::new(); options.write(true).create_new(true);
    #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
    let mut file = options.open(path)?; file.write_all(bytes)?; file.sync_all()?; Ok(())
}
fn read_bounded(path: &Path, max: u64) -> Result<Vec<u8>> {
    if checked_metadata(path, false)?.len() > max { return Err(ArchiveError::CorruptArchive); }
    let file = File::open(path)?; let mut bytes = Vec::new();
    file.take(max + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > max { return Err(ArchiveError::CorruptArchive); }
    Ok(bytes)
}
fn sync_dir(path: &Path) -> Result<()> {
    #[cfg(unix)] { File::open(path)?.sync_all()?; }
    // Windows std::fs cannot promise directory flush durability. Files are
    // flushed, but power-loss durability needs platform acceptance before release.
    #[cfg(not(unix))] { let _ = path; }
    Ok(())
}
