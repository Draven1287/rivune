use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::State;

const MAX_PROMPT_BYTES: usize = 128 * 1024;
const MAX_CAPTURE_BYTES: usize = 2 * 1024 * 1024;
const MAX_TIMEOUT_MS: u64 = 10 * 60 * 1000;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub draft: String,
    #[serde(default)]
    pub approved_context: ApprovedContext,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedContext {
    pub project_instructions: String,
    pub conversation_history: String,
    pub documents: String,
    pub selected_artifact: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    Codex,
    Claude,
    Fixture,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub id: String,
    pub kind: ProviderKind,
    pub executable_path: String,
    pub model: Option<String>,
    pub timeout_ms: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdmittedRequest {
    pub request_id: String,
    pub conversation_id: String,
    pub prompt: String,
    pub mode: String,
    pub provider: ProviderConfig,
    pub approved_context: ApprovedContext,
    pub retry_of: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunRecord {
    pub id: String,
    pub conversation_id: String,
    pub status: String,
    pub updated_at: String,
    pub admitted: AdmittedRequest,
    pub answer: Option<String>,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub schema_version: u32,
    pub conversations: Vec<Conversation>,
    pub runs: Vec<RunRecord>,
    pub providers: Vec<ProviderConfig>,
    pub selected_provider_id: Option<String>,
}

impl Default for WorkspaceSnapshot {
    fn default() -> Self {
        Self {
            schema_version: 1,
            conversations: vec![Conversation {
                id: "welcome".into(),
                title: "New conversation".into(),
                draft: String::new(),
                approved_context: ApprovedContext::default(),
            }],
            runs: Vec::new(),
            providers: Vec::new(),
            selected_provider_id: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitRunRequest {
    pub id: String,
    pub conversation_id: String,
    pub prompt: String,
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetryRunRequest {
    pub source_run_id: String,
    pub new_request_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Acknowledgement {
    pub state: String,
    pub request_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Acknowledgement {
    fn accepted(id: &str) -> Self {
        Self {
            state: "accepted".into(),
            request_id: id.into(),
            error: None,
        }
    }
    fn rejected(id: &str, error: impl Into<String>) -> Self {
        Self {
            state: "rejected".into(),
            request_id: id.into(),
            error: Some(error.into()),
        }
    }
    fn uncertain(id: &str) -> Self {
        Self {
            state: "uncertain".into(),
            request_id: id.into(),
            error: None,
        }
    }
}

pub struct HostState {
    profile: PathBuf,
    workspace: Mutex<WorkspaceSnapshot>,
    cancellations: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl HostState {
    pub fn open(profile: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        fs::create_dir_all(&profile)?;
        let snapshots = profile.join("snapshots");
        fs::create_dir_all(&snapshots)?;
        let mut committed = fs::read_dir(&snapshots)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| path.extension().and_then(|value| value.to_str()) == Some("json"))
            .collect::<Vec<_>>();
        committed.sort();
        let has_pending = fs::read_dir(&snapshots)?
            .filter_map(Result::ok)
            .any(|entry| {
                entry.path().extension().and_then(|value| value.to_str()) == Some("pending")
            });
        let mut workspace = if let Some(path) = committed.last() {
            let decoded: WorkspaceSnapshot = serde_json::from_slice(&fs::read(path)?)?;
            if decoded.schema_version != 1 {
                return Err("unsupported workspace schema".into());
            }
            decoded
        } else if has_pending {
            return Err(
                "an interrupted workspace save requires recovery; no empty store was created"
                    .into(),
            );
        } else {
            let initial = WorkspaceSnapshot::default();
            persist(&profile, &initial)?;
            initial
        };
        let interrupted = workspace
            .runs
            .iter_mut()
            .filter(|run| run.status == "running" || run.status == "queued")
            .collect::<Vec<_>>();
        if !interrupted.is_empty() {
            for run in interrupted {
                run.status = "failed".into();
                run.error = Some("The app closed before this local task finished. Retry from its original admitted context.".into());
                run.updated_at = now_marker();
            }
            persist(&profile, &workspace)?;
        }
        Ok(Self {
            profile,
            workspace: Mutex::new(workspace),
            cancellations: Mutex::new(HashMap::new()),
        })
    }

    fn save(&self, workspace: &WorkspaceSnapshot) -> Result<(), String> {
        persist(&self.profile, workspace).map_err(|error| error.to_string())
    }

    fn execute(&self, admitted: AdmittedRequest) -> Acknowledgement {
        if admitted.request_id.is_empty() || admitted.request_id.len() > 128 {
            return Acknowledgement::rejected(&admitted.request_id, "Invalid request ID.");
        }
        if admitted.prompt.trim().is_empty() || admitted.prompt.len() > MAX_PROMPT_BYTES {
            return Acknowledgement::rejected(
                &admitted.request_id,
                "The prompt is empty or exceeds the local limit.",
            );
        }
        if admitted.mode != "direct" {
            return Acknowledgement::rejected(
                &admitted.request_id,
                "Only direct local-provider runs are admitted in this first runtime slice.",
            );
        }
        let context_bytes = admitted
            .approved_context
            .project_instructions
            .len()
            .saturating_add(admitted.approved_context.conversation_history.len())
            .saturating_add(admitted.approved_context.documents.len())
            .saturating_add(admitted.approved_context.selected_artifact.len());
        if context_bytes > 512 * 1024 {
            return Acknowledgement::rejected(
                &admitted.request_id,
                "The approved context exceeds the local limit.",
            );
        }
        if let Err(error) = validate_provider(&admitted.provider) {
            return Acknowledgement::rejected(&admitted.request_id, error);
        }
        {
            let mut workspace = self.workspace.lock().expect("workspace lock poisoned");
            if let Some(existing) = workspace
                .runs
                .iter()
                .find(|run| run.id == admitted.request_id)
            {
                return if existing.admitted == admitted {
                    Acknowledgement::accepted(&admitted.request_id)
                } else {
                    Acknowledgement::rejected(
                        &admitted.request_id,
                        "That request ID is already bound to different content.",
                    )
                };
            }
            if !workspace
                .conversations
                .iter()
                .any(|item| item.id == admitted.conversation_id)
            {
                return Acknowledgement::rejected(
                    &admitted.request_id,
                    "The conversation no longer exists.",
                );
            }
            workspace.runs.push(RunRecord {
                id: admitted.request_id.clone(),
                conversation_id: admitted.conversation_id.clone(),
                status: "running".into(),
                updated_at: now_marker(),
                admitted: admitted.clone(),
                answer: None,
                error: None,
            });
            if let Err(error) = self.save(&workspace) {
                workspace.runs.retain(|run| run.id != admitted.request_id);
                return Acknowledgement::rejected(
                    &admitted.request_id,
                    format!("Could not save the admitted request: {error}"),
                );
            }
        }

        let cancellation = Arc::new(AtomicBool::new(false));
        self.cancellations
            .lock()
            .expect("cancellation lock poisoned")
            .insert(admitted.request_id.clone(), cancellation.clone());
        let result = run_direct(&admitted, cancellation);
        self.cancellations
            .lock()
            .expect("cancellation lock poisoned")
            .remove(&admitted.request_id);

        let mut workspace = self.workspace.lock().expect("workspace lock poisoned");
        if let Some(run) = workspace
            .runs
            .iter_mut()
            .find(|run| run.id == admitted.request_id)
        {
            run.updated_at = now_marker();
            match result {
                Ok(answer) => {
                    run.status = "completed".into();
                    run.answer = Some(answer);
                }
                Err(RunFailure::Cancelled) => {
                    run.status = "cancelled".into();
                    run.error = Some("Cancelled by the user.".into());
                }
                Err(error) => {
                    run.status = "failed".into();
                    run.error = Some(error.to_string());
                }
            }
        }
        if self.save(&workspace).is_err() {
            return Acknowledgement::uncertain(&admitted.request_id);
        }
        Acknowledgement::accepted(&admitted.request_id)
    }
}

fn persist(
    profile: &Path,
    workspace: &WorkspaceSnapshot,
) -> Result<(), Box<dyn std::error::Error>> {
    persist_with_fault(profile, workspace, PersistFault::None)
}

#[derive(Clone, Copy, PartialEq)]
enum PersistFault {
    None,
    AfterWrite,
    AfterSync,
}

fn persist_with_fault(
    profile: &Path,
    workspace: &WorkspaceSnapshot,
    fault: PersistFault,
) -> Result<(), Box<dyn std::error::Error>> {
    let bytes = serde_json::to_vec_pretty(workspace)?;
    let directory = profile.join("snapshots");
    fs::create_dir_all(&directory)?;
    let tag = format!("{}-{}", unique_marker(), std::process::id());
    let pending = directory.join(format!("workspace-v1-{tag}.pending"));
    let committed = directory.join(format!("workspace-v1-{tag}.json"));
    let mut file = File::options()
        .write(true)
        .create_new(true)
        .open(&pending)?;
    file.write_all(&bytes)?;
    if fault == PersistFault::AfterWrite {
        return Err("injected after write".into());
    }
    file.sync_all()?;
    if fault == PersistFault::AfterSync {
        return Err("injected after sync".into());
    }
    fs::rename(pending, committed)?;
    Ok(())
}

fn unique_marker() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

fn validate_provider(provider: &ProviderConfig) -> Result<(), String> {
    let path = Path::new(&provider.executable_path);
    if provider.id.is_empty()
        || provider.id.len() > 128
        || !path.is_absolute()
        || !path.is_file()
        || provider.timeout_ms < 1_000
        || provider.timeout_ms > MAX_TIMEOUT_MS
    {
        return Err("The provider configuration is invalid or unavailable.".into());
    }
    if provider
        .model
        .as_ref()
        .is_some_and(|model| model.is_empty() || model.len() > 256 || model.contains('\0'))
    {
        return Err("The provider model selection is invalid.".into());
    }
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let expected = match provider.kind {
        ProviderKind::Codex => "codex",
        ProviderKind::Claude => "claude",
        ProviderKind::Fixture if cfg!(test) && provider.id.starts_with("fixture:") => return Ok(()),
        ProviderKind::Fixture => {
            return Err(
                "Fixture providers are test-only and cannot be configured in the app.".into(),
            )
        }
    };
    let allowed =
        name == expected || name == format!("{expected}.exe") || name == format!("{expected}.com");
    if !allowed {
        return Err(format!(
            "The executable does not match the selected {expected} adapter."
        ));
    }
    #[cfg(windows)]
    if !(name.ends_with(".exe") || name.ends_with(".com")) {
        return Err("Windows providers must be direct .exe or .com executables; script wrappers are not admitted.".into());
    }
    Ok(())
}

fn now_marker() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}

#[derive(Debug)]
enum RunFailure {
    Invalid(String),
    Spawn(String),
    TimedOut,
    Cancelled,
    Exit(String),
}

impl std::fmt::Display for RunFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Invalid(value) | Self::Spawn(value) | Self::Exit(value) => {
                formatter.write_str(value)
            }
            Self::TimedOut => formatter.write_str("The local provider timed out."),
            Self::Cancelled => formatter.write_str("The local provider was cancelled."),
        }
    }
}

fn run_direct(
    request: &AdmittedRequest,
    cancellation: Arc<AtomicBool>,
) -> Result<String, RunFailure> {
    let provider = &request.provider;
    validate_provider(provider).map_err(RunFailure::Invalid)?;
    let executable = Path::new(&provider.executable_path);
    if !executable.is_absolute() || !executable.is_file() || provider.executable_path.contains('\0')
    {
        return Err(RunFailure::Invalid(
            "The configured provider executable or arguments are invalid.".into(),
        ));
    }
    #[cfg(windows)]
    if !matches!(
        executable
            .extension()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("exe") | Some("com")
    ) {
        return Err(RunFailure::Invalid("Windows providers must be direct .exe or .com executables; script wrappers are not admitted.".into()));
    }
    let timeout = provider.timeout_ms.clamp(1_000, MAX_TIMEOUT_MS);
    let mut arguments = match provider.kind {
        ProviderKind::Codex => vec![
            "exec".to_string(),
            "--skip-git-repo-check".to_string(),
            "-".to_string(),
        ],
        ProviderKind::Claude => vec!["--print".to_string()],
        ProviderKind::Fixture => Vec::new(),
    };
    if let Some(model) = &provider.model {
        arguments.extend(["--model".into(), model.clone()]);
    }
    let mut command = Command::new(executable);
    command
        .args(&arguments)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env_clear();
    for key in [
        "PATH",
        "HOME",
        "USERPROFILE",
        "TMPDIR",
        "TEMP",
        "LANG",
        "LC_ALL",
        "TERM",
        "NO_COLOR",
    ] {
        if let Ok(value) = std::env::var(key) {
            command.env(key, value);
        }
    }
    let mut child = command.spawn().map_err(|error| {
        RunFailure::Spawn(format!("Could not start the local provider: {error}"))
    })?;
    let Some(mut stdin) = child.stdin.take() else {
        terminate_and_reap(&mut child);
        return Err(RunFailure::Spawn("Provider stdin was unavailable.".into()));
    };
    let Some(stdout) = child.stdout.take() else {
        terminate_and_reap(&mut child);
        return Err(RunFailure::Spawn("Provider stdout was unavailable.".into()));
    };
    let Some(stderr) = child.stderr.take() else {
        terminate_and_reap(&mut child);
        return Err(RunFailure::Spawn("Provider stderr was unavailable.".into()));
    };
    let (stdout_tx, stdout_rx) = mpsc::channel();
    let (stderr_tx, stderr_rx) = mpsc::channel();
    let (stdin_tx, stdin_rx) = mpsc::channel();
    thread::spawn(move || {
        let _ = stdout_tx.send(read_bounded(stdout));
    });
    thread::spawn(move || {
        let _ = stderr_tx.send(read_bounded(stderr));
    });
    let input = request.prompt.as_bytes().to_vec();
    thread::spawn(move || {
        let result = stdin.write_all(&input).map_err(|error| error.to_string());
        drop(stdin);
        let _ = stdin_tx.send(result);
    });
    let started = Instant::now();
    let status = loop {
        if cancellation.load(Ordering::SeqCst) {
            terminate_and_reap(&mut child);
            return Err(RunFailure::Cancelled);
        }
        if started.elapsed() >= Duration::from_millis(timeout) {
            terminate_and_reap(&mut child);
            return Err(RunFailure::TimedOut);
        }
        if let Ok(Err(error)) = stdin_rx.try_recv() {
            terminate_and_reap(&mut child);
            return Err(RunFailure::Spawn(format!(
                "Could not send the request: {error}"
            )));
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => thread::sleep(Duration::from_millis(25)),
            Err(error) => {
                terminate_and_reap(&mut child);
                return Err(RunFailure::Spawn(format!(
                    "Could not observe the provider process: {error}"
                )));
            }
        }
    };
    let grace = Duration::from_secs(1);
    let (out, out_truncated) = stdout_rx.recv_timeout(grace).map_err(|_| {
        RunFailure::Spawn("Provider stdout did not close after the child exited.".into())
    })?;
    let (err, err_truncated) = stderr_rx.recv_timeout(grace).map_err(|_| {
        RunFailure::Spawn("Provider stderr did not close after the child exited.".into())
    })?;
    if !status.success() {
        let mut detail = String::from_utf8_lossy(&err).trim().to_string();
        if detail.is_empty() {
            detail = format!("Provider exited with {status}.");
        }
        if err_truncated {
            detail.push_str(" [stderr truncated]");
        }
        return Err(RunFailure::Exit(detail));
    }
    let mut answer = String::from_utf8(out)
        .map_err(|_| RunFailure::Exit("Provider returned non-UTF-8 output.".into()))?;
    if out_truncated {
        answer.push_str("\n[output truncated]");
    }
    Ok(answer)
}

fn terminate_and_reap(child: &mut std::process::Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn read_bounded(mut reader: impl Read) -> (Vec<u8>, bool) {
    let mut stored = Vec::new();
    let mut buffer = [0u8; 8 * 1024];
    let mut truncated = false;
    loop {
        match reader.read(&mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(count) => {
                let remaining = MAX_CAPTURE_BYTES.saturating_sub(stored.len());
                stored.extend_from_slice(&buffer[..count.min(remaining)]);
                if count > remaining {
                    truncated = true;
                }
            }
        }
    }
    (stored, truncated)
}

#[tauri::command]
pub fn get_snapshot(state: State<'_, Arc<HostState>>) -> Result<WorkspaceSnapshot, String> {
    Ok(state
        .workspace
        .lock()
        .map_err(|_| "Workspace is unavailable.")?
        .clone())
}

#[tauri::command]
pub fn configure_provider(
    provider: ProviderConfig,
    select: bool,
    state: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    validate_provider(&provider)?;
    let mut workspace = state
        .workspace
        .lock()
        .map_err(|_| "Workspace is unavailable.")?;
    if let Some(existing) = workspace
        .providers
        .iter_mut()
        .find(|item| item.id == provider.id)
    {
        *existing = provider.clone();
    } else {
        workspace.providers.push(provider.clone());
    }
    if select {
        workspace.selected_provider_id = Some(provider.id);
    }
    state.save(&workspace)
}

#[tauri::command]
pub fn create_conversation(
    id: String,
    title: String,
    state: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    if id.is_empty() || id.len() > 128 || title.trim().is_empty() || title.len() > 256 {
        return Err("Invalid conversation.".into());
    }
    let mut workspace = state
        .workspace
        .lock()
        .map_err(|_| "Workspace is unavailable.")?;
    if workspace.conversations.iter().any(|item| item.id == id) {
        return Err("Conversation already exists.".into());
    }
    workspace.conversations.push(Conversation {
        id,
        title: title.trim().into(),
        draft: String::new(),
        approved_context: ApprovedContext::default(),
    });
    state.save(&workspace)
}

#[tauri::command]
pub fn open_conversation(
    conversation_id: String,
    state: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    let workspace = state
        .workspace
        .lock()
        .map_err(|_| "Workspace is unavailable.")?;
    if workspace
        .conversations
        .iter()
        .any(|item| item.id == conversation_id)
    {
        Ok(())
    } else {
        Err("Conversation not found.".into())
    }
}

#[tauri::command]
pub fn save_draft(
    conversation_id: String,
    draft: String,
    state: State<'_, Arc<HostState>>,
) -> Result<(), String> {
    if draft.len() > MAX_PROMPT_BYTES {
        return Err("The draft exceeds the local limit.".into());
    }
    let mut workspace = state
        .workspace
        .lock()
        .map_err(|_| "Workspace is unavailable.")?;
    let Some(conversation) = workspace
        .conversations
        .iter_mut()
        .find(|item| item.id == conversation_id)
    else {
        return Err("Conversation not found.".into());
    };
    conversation.draft = draft;
    state.save(&workspace)
}

#[tauri::command]
pub async fn submit_run(
    request: SubmitRunRequest,
    state: State<'_, Arc<HostState>>,
) -> Result<Acknowledgement, String> {
    let (provider, approved_context) = {
        let workspace = state
            .workspace
            .lock()
            .map_err(|_| "Workspace is unavailable.")?;
        let Some(selected) = workspace.selected_provider_id.as_ref() else {
            return Ok(Acknowledgement::rejected(
                &request.id,
                "Connect and select a local provider first.",
            ));
        };
        let Some(provider) = workspace
            .providers
            .iter()
            .find(|provider| &provider.id == selected)
        else {
            return Ok(Acknowledgement::rejected(
                &request.id,
                "The selected local provider is no longer configured.",
            ));
        };
        let Some(conversation) = workspace
            .conversations
            .iter()
            .find(|item| item.id == request.conversation_id)
        else {
            return Ok(Acknowledgement::rejected(
                &request.id,
                "The conversation no longer exists.",
            ));
        };
        (provider.clone(), conversation.approved_context.clone())
    };
    let admitted = AdmittedRequest {
        request_id: request.id,
        conversation_id: request.conversation_id,
        prompt: request.prompt,
        mode: request.mode,
        provider,
        approved_context,
        retry_of: None,
    };
    let host = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || host.execute(admitted))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reconcile_run(request_id: String, state: State<'_, Arc<HostState>>) -> Acknowledgement {
    let workspace = state.workspace.lock().expect("workspace lock poisoned");
    if workspace.runs.iter().any(|run| run.id == request_id) {
        Acknowledgement::accepted(&request_id)
    } else {
        Acknowledgement::uncertain(&request_id)
    }
}

#[tauri::command]
pub fn cancel_run(request_id: String, state: State<'_, Arc<HostState>>) -> Acknowledgement {
    let cancellations = state
        .cancellations
        .lock()
        .expect("cancellation lock poisoned");
    if let Some(flag) = cancellations.get(&request_id) {
        flag.store(true, Ordering::SeqCst);
        Acknowledgement::accepted(&request_id)
    } else {
        Acknowledgement::rejected(&request_id, "That request is not running on this device.")
    }
}

#[tauri::command]
pub async fn retry_run(
    request: RetryRunRequest,
    state: State<'_, Arc<HostState>>,
) -> Result<Acknowledgement, String> {
    let admitted = {
        let workspace = state
            .workspace
            .lock()
            .map_err(|_| "Workspace is unavailable.")?;
        let Some(source) = workspace
            .runs
            .iter()
            .find(|run| run.id == request.source_run_id)
        else {
            return Ok(Acknowledgement::rejected(
                &request.new_request_id,
                "The original admitted request is unavailable; start a new request explicitly.",
            ));
        };
        let mut admitted = source.admitted.clone();
        admitted.request_id = request.new_request_id;
        admitted.retry_of = Some(source.id.clone());
        admitted
    };
    let host = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || host.execute(admitted))
        .await
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn profile(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "rivune-tauri-{name}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn workspace_round_trips_without_a_second_store() {
        let path = profile("roundtrip");
        let host = HostState::open(path.clone()).unwrap();
        {
            let mut workspace = host.workspace.lock().unwrap();
            workspace.conversations[0].draft = "unsent draft".into();
            host.save(&workspace).unwrap();
        }
        drop(host);
        let reopened = HostState::open(path.clone()).unwrap();
        assert_eq!(
            reopened.workspace.lock().unwrap().conversations[0].draft,
            "unsent draft"
        );
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn bounded_reader_drains_but_retains_only_the_limit() {
        let bytes = vec![b'x'; MAX_CAPTURE_BYTES + 37];
        let (stored, truncated) = read_bounded(Cursor::new(bytes));
        assert_eq!(stored.len(), MAX_CAPTURE_BYTES);
        assert!(truncated);
    }

    #[test]
    fn interrupted_generation_never_replaces_the_last_committed_snapshot() {
        let path = profile("fault");
        let host = HostState::open(path.clone()).unwrap();
        let mut changed = host.workspace.lock().unwrap().clone();
        changed.conversations[0].draft = "must not appear".into();
        assert!(persist_with_fault(&path, &changed, PersistFault::AfterSync).is_err());
        drop(host);
        let reopened = HostState::open(path.clone()).unwrap();
        assert_eq!(
            reopened.workspace.lock().unwrap().conversations[0].draft,
            ""
        );
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn only_an_interrupted_generation_fails_closed_instead_of_making_an_empty_store() {
        let path = profile("only-pending");
        fs::create_dir_all(&path).unwrap();
        assert!(persist_with_fault(
            &path,
            &WorkspaceSnapshot::default(),
            PersistFault::AfterWrite
        )
        .is_err());
        assert!(HostState::open(path.clone()).is_err());
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn reopening_marks_an_inflight_run_interrupted_with_original_context_intact() {
        let path = profile("interrupted-run");
        let host = HostState::open(path.clone()).unwrap();
        let provider = ProviderConfig {
            id: "fixture:cat".into(),
            kind: ProviderKind::Fixture,
            executable_path: "/bin/cat".into(),
            model: None,
            timeout_ms: 2_000,
        };
        let context = ApprovedContext {
            project_instructions: "A".into(),
            conversation_history: "history A".into(),
            documents: "docs A".into(),
            selected_artifact: "artifact A".into(),
        };
        {
            let mut workspace = host.workspace.lock().unwrap();
            workspace.runs.push(RunRecord {
                id: "inflight".into(),
                conversation_id: "welcome".into(),
                status: "running".into(),
                updated_at: now_marker(),
                admitted: AdmittedRequest {
                    request_id: "inflight".into(),
                    conversation_id: "welcome".into(),
                    prompt: "original".into(),
                    mode: "direct".into(),
                    provider,
                    approved_context: context.clone(),
                    retry_of: None,
                },
                answer: None,
                error: None,
            });
            host.save(&workspace).unwrap();
        }
        drop(host);
        let reopened = HostState::open(path.clone()).unwrap();
        let workspace = reopened.workspace.lock().unwrap();
        assert_eq!(workspace.runs[0].status, "failed");
        assert_eq!(workspace.runs[0].admitted.approved_context, context);
        assert!(workspace.runs[0]
            .error
            .as_deref()
            .unwrap()
            .contains("closed"));
        drop(workspace);
        fs::remove_dir_all(path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn direct_fixture_process_receives_stdin_without_a_shell() {
        let path = profile("cat");
        let host = HostState::open(path.clone()).unwrap();
        {
            let mut workspace = host.workspace.lock().unwrap();
            workspace.providers.push(ProviderConfig {
                id: "fixture:cat".into(),
                kind: ProviderKind::Fixture,
                executable_path: "/bin/cat".into(),
                model: None,
                timeout_ms: 2_000,
            });
            workspace.selected_provider_id = Some("fixture:cat".into());
            host.save(&workspace).unwrap();
        }
        let provider = host.workspace.lock().unwrap().providers[0].clone();
        let admitted = AdmittedRequest {
            request_id: "request-one".into(),
            conversation_id: "welcome".into(),
            prompt: "literal $(touch never)".into(),
            mode: "direct".into(),
            provider,
            approved_context: ApprovedContext::default(),
            retry_of: None,
        };
        assert_eq!(host.execute(admitted.clone()).state, "accepted");
        let workspace = host.workspace.lock().unwrap();
        let run = workspace
            .runs
            .iter()
            .find(|run| run.id == "request-one")
            .unwrap();
        assert_eq!(run.answer.as_deref(), Some("literal $(touch never)"));
        assert_eq!(run.status, "completed");
        drop(workspace);
        let mut altered = admitted;
        altered.prompt = "different content".into();
        assert_eq!(host.execute(altered).state, "rejected");
        assert_eq!(host.workspace.lock().unwrap().runs.len(), 1);
        fs::remove_dir_all(path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn child_only_cancellation_is_observed() {
        let request = AdmittedRequest {
            request_id: "cancel-me".into(),
            conversation_id: "welcome".into(),
            prompt: "ignored".into(),
            mode: "direct".into(),
            provider: ProviderConfig {
                id: "fixture:yes".into(),
                kind: ProviderKind::Fixture,
                executable_path: "/usr/bin/yes".into(),
                model: None,
                timeout_ms: 10_000,
            },
            approved_context: ApprovedContext::default(),
            retry_of: None,
        };
        let flag = Arc::new(AtomicBool::new(false));
        let later = flag.clone();
        let trigger = thread::spawn(move || {
            thread::sleep(Duration::from_millis(75));
            later.store(true, Ordering::SeqCst);
        });
        assert!(matches!(
            run_direct(&request, flag),
            Err(RunFailure::Cancelled)
        ));
        trigger.join().unwrap();
    }
}
