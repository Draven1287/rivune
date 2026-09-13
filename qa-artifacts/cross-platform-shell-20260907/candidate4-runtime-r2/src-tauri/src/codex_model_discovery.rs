//! Bounded metadata-only Codex app-server client. No thread/turn/auth mutations.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use std::path::Path;

const MAX_BYTES: usize = 1024 * 1024;
const MAX_LINE: usize = 256 * 1024;
const MAX_MODELS: usize = 128;
const MAX_PAGES: usize = 4;
const TIMEOUT: Duration = Duration::from_secs(8);
const MAX_REQUEST_IDENTITIES: usize = 1024;
static CLEANUP_QUARANTINED: AtomicBool = AtomicBool::new(false);
static REGISTRY: Mutex<Option<Registry>> = Mutex::new(None);
#[cfg(test)]
static TEST_REGISTRY_LOCK: Mutex<()> = Mutex::new(());
#[cfg(test)]
thread_local! { static BEGIN_BARRIERS: std::cell::RefCell<Option<(Arc<std::sync::Barrier>, Arc<std::sync::Barrier>)>> = const { std::cell::RefCell::new(None) }; }
#[derive(Default)]
struct Registry { active: Option<String>, identities: HashMap<String, Arc<AtomicBool>> }
impl Registry {
    fn begin(&mut self, id: &str) -> Result<Arc<AtomicBool>, &'static str> {
        if let Some(token) = self.identities.get(id) {
            return Err(if token.load(Ordering::SeqCst) { "DISCOVERY_CANCELLED" } else { "DISCOVERY_ID_REUSED" });
        }
        if self.identities.len() >= MAX_REQUEST_IDENTITIES { return Err("DISCOVERY_IDENTITY_LIMIT"); }
        if self.active.is_some() { return Err("DISCOVERY_BUSY"); }
        let token = Arc::new(AtomicBool::new(false));
        self.identities.insert(id.into(), token.clone()); self.active = Some(id.into()); Ok(token)
    }
    fn cancel(&mut self, id: &str) -> bool {
        if let Some(token) = self.identities.get(id) { token.store(true, Ordering::SeqCst); return true; }
        if self.identities.len() >= MAX_REQUEST_IDENTITIES { return false; }
        self.identities.insert(id.into(), Arc::new(AtomicBool::new(true))); true
    }
    fn finish(&mut self, id: &str) { if self.active.as_deref() == Some(id) { self.active = None; } }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Request { #[serde(rename="requestID")] pub request_id: String, #[serde(rename="providerID")] pub provider_id: String }
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvertisedModel {
    pub id: String, pub model: String, pub label: String,
    pub reasoning_efforts: Vec<String>, pub default_reasoning_effort: String,
    pub is_default: bool,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub schema_version: u32,
    #[serde(rename="requestID")] pub request_id: String,
    #[serde(rename="providerID")] pub provider_id: String,
    pub source: &'static str, pub scope: &'static str, pub state: &'static str,
    pub authentication: &'static str, pub selection_enabled: bool,
    pub models: Vec<AdvertisedModel>, pub error_code: Option<&'static str>,
}
impl Report {
    pub fn failure(request: &Request, error: &'static str) -> Self {
        Self { schema_version: 1, request_id: request.request_id.clone(), provider_id: request.provider_id.clone(),
            source: "codexAppServerModelList", scope: "isolatedUnauthenticated", state: match error {
                "DISCOVERY_CANCELLED" => "cancelled", "DISCOVERY_TIMEOUT" => "timeout",
                "DISCOVERY_UNSUPPORTED" => "unsupported", _ => "error" },
            authentication: "unknown", selection_enabled: false, models: vec![], error_code: Some(error) }
    }
}
pub fn valid_id(s: &str) -> bool { !s.is_empty() && s.len() <= 128 && s.trim() == s && !s.chars().any(char::is_control) }
pub struct Lease { id: String, pub cancelled: Arc<AtomicBool> }
impl Drop for Lease { fn drop(&mut self) { if let Ok(mut registry) = REGISTRY.lock() { if let Some(registry) = registry.as_mut() { registry.finish(&self.id); } } } }
pub fn begin(request: &Request) -> Result<Lease, &'static str> {
    if !valid_id(&request.request_id) || !valid_id(&request.provider_id) { return Err("DISCOVERY_INVALID_REQUEST"); }
    if CLEANUP_QUARANTINED.load(Ordering::SeqCst) { return Err("DISCOVERY_CLEANUP_PENDING"); }
    #[cfg(test)]
    BEGIN_BARRIERS.with(|slot| { if let Some((ready, resume)) = slot.borrow_mut().take() { ready.wait(); resume.wait(); } });
    let mut registry = REGISTRY.lock().map_err(|_| "DISCOVERY_BUSY")?;
    // A contender may have passed the fast check before the active lease quarantined.
    // Its admission must observe quarantine after acquiring the lease-release mutex.
    if CLEANUP_QUARANTINED.load(Ordering::SeqCst) { return Err("DISCOVERY_CLEANUP_PENDING"); }
    let cancelled = registry.get_or_insert_with(Registry::default).begin(&request.request_id)?;
    Ok(Lease { id: request.request_id.clone(), cancelled })
}
pub fn cancel(id: &str) -> bool {
    if !valid_id(id) { return false; }
    REGISTRY.lock().map(|mut registry| registry.get_or_insert_with(Registry::default).cancel(id)).unwrap_or(false)
}
fn with_cleanup<T>(result: Result<T, &'static str>, cleaned: bool) -> Result<T, &'static str> {
    if cleaned { result } else { Err("DISCOVERY_CLEANUP_FAILED") }
}
trait Transport {
    fn send(&mut self, message: &Value) -> Result<(), &'static str>;
    fn receive(&mut self, deadline: Instant, cancelled: &AtomicBool) -> Result<Value, &'static str>;
}
fn check(deadline: Instant, cancelled: &AtomicBool) -> Result<(), &'static str> {
    if cancelled.load(Ordering::SeqCst) { Err("DISCOVERY_CANCELLED") }
    else if Instant::now() >= deadline { Err("DISCOVERY_TIMEOUT") } else { Ok(()) }
}
fn response(io: &mut impl Transport, id: u64, deadline: Instant, cancelled: &AtomicBool) -> Result<Value, &'static str> {
    for _ in 0..32 {
        check(deadline, cancelled)?;
        let value = io.receive(deadline, cancelled)?;
        if value.get("id").is_none() && value.get("method").and_then(Value::as_str).is_some() { continue; }
        // Do not answer server-initiated requests (including token refresh or approval).
        if value.get("method").is_some() || value.get("id").and_then(Value::as_u64) != Some(id) { return Err("DISCOVERY_PROTOCOL_ERROR"); }
        if let Some(error) = value.get("error") { return Err(if error.get("code").and_then(Value::as_i64) == Some(-32601) { "DISCOVERY_UNSUPPORTED" } else { "DISCOVERY_PROVIDER_ERROR" }); }
        return value.get("result").cloned().ok_or("DISCOVERY_PROTOCOL_ERROR");
    }
    Err("DISCOVERY_LIMIT")
}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct RawModel { id: String, model: String, display_name: String, hidden: bool, is_default: bool,
    supported_reasoning_efforts: Vec<RawEffort>, default_reasoning_effort: String }
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct RawEffort { reasoning_effort: String }
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct Page { data: Vec<RawModel>, #[serde(default)] next_cursor: Option<String> }
fn session(io: &mut impl Transport, request: &Request, cancelled: &AtomicBool, timeout: Duration) -> Result<Report, &'static str> {
    let deadline = Instant::now() + timeout; check(deadline, cancelled)?;
    io.send(&json!({"id":1,"method":"initialize","params":{"clientInfo":{"name":"rivune_model_discovery","title":"Rivune model discovery","version":"0.1.0"}}}))?;
    let initialized = response(io, 1, deadline, cancelled)?;
    if initialized.get("userAgent").and_then(Value::as_str).is_none() { return Err("DISCOVERY_PROTOCOL_ERROR"); }
    io.send(&json!({"method":"initialized","params":{}}))?;
    io.send(&json!({"id":2,"method":"account/read","params":{"refreshToken":false}}))?;
    let account = response(io, 2, deadline, cancelled)?;
    if account.get("account") != Some(&Value::Null) { return Err("DISCOVERY_ISOLATION_VIOLATION"); }
    let required = account.get("requiresOpenaiAuth").and_then(Value::as_bool).ok_or("DISCOVERY_PROTOCOL_ERROR")?;
    let mut models = vec![]; let mut ids = HashSet::new(); let mut cursors = HashSet::new(); let mut cursor: Option<String> = None;
    for page_index in 0..MAX_PAGES {
        check(deadline, cancelled)?; let id = 3 + page_index as u64;
        io.send(&json!({"id":id,"method":"model/list","params":{"includeHidden":false,"limit":32,"cursor":cursor}}))?;
        let page: Page = serde_json::from_value(response(io, id, deadline, cancelled)?).map_err(|_| "DISCOVERY_PROTOCOL_ERROR")?;
        if page.data.len() > 32 || ids.len() + page.data.len() > MAX_MODELS { return Err("DISCOVERY_LIMIT"); }
        for raw in page.data {
            if !valid_id(&raw.id) || !valid_id(&raw.model) || raw.display_name.trim().is_empty() || raw.display_name.len() > 256
                || raw.display_name.chars().any(char::is_control) || !ids.insert(raw.id.clone())
                || raw.supported_reasoning_efforts.len() > 16 { return Err("DISCOVERY_PROTOCOL_ERROR"); }
            let efforts = raw.supported_reasoning_efforts.into_iter().map(|e| e.reasoning_effort).collect::<Vec<_>>();
            let unique = efforts.iter().collect::<HashSet<_>>();
            if efforts.iter().any(|e| !valid_id(e)) || unique.len() != efforts.len() || !efforts.contains(&raw.default_reasoning_effort) { return Err("DISCOVERY_PROTOCOL_ERROR"); }
            if !raw.hidden { models.push(AdvertisedModel { id:raw.id, model:raw.model, label:raw.display_name, reasoning_efforts:efforts, default_reasoning_effort:raw.default_reasoning_effort, is_default:raw.is_default }); }
        }
        match page.next_cursor {
            None => return Ok(Report { schema_version:1, request_id:request.request_id.clone(), provider_id:request.provider_id.clone(), source:"codexAppServerModelList", scope:"isolatedUnauthenticated", state:if required {"unauthenticated"} else {"available"}, authentication:"notAuthenticated", selection_enabled:false, models, error_code:None }),
            Some(next) if !next.is_empty() && next.len() <= 1024 && cursors.insert(next.clone()) => cursor = Some(next),
            _ => return Err("DISCOVERY_PROTOCOL_ERROR"),
        }
    }
    Err("DISCOVERY_LIMIT")
}

#[cfg(unix)]
mod process {
    use super::*;
    use std::io::{Read, Write};
    use std::os::fd::AsRawFd;
    use std::os::unix::process::CommandExt;
    use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
    use std::path::PathBuf;
    struct Process { child: Child, input: ChildStdin, output: ChildStdout, home: PathBuf, pending: Vec<u8>, total: usize, cleaned: bool }
    impl Process {
        fn cleanup(&mut self) -> bool { self.cleanup_with(|path| std::fs::remove_dir_all(path)) }
        fn cleanup_with(&mut self, remove: impl FnOnce(&Path) -> std::io::Result<()>) -> bool {
            if self.cleaned { return true; }
            // Child has not been reaped, so the group identity cannot be recycled.
            let killed = unsafe { libc::kill(-(self.child.id() as i32), libc::SIGKILL) } == 0
                || std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH);
            // Always attempt all cleanup steps, even when an earlier one fails.
            let _ = self.child.kill();
            let waited = self.child.wait().is_ok();
            let removed = match remove(&self.home) {
                Ok(()) => true, Err(e) => e.kind() == std::io::ErrorKind::NotFound,
            };
            // Do not retry group kill after wait: that group identity may be recycled.
            self.cleaned = true;
            killed && waited && removed
        }
    }
    fn finish(mut io: Process, result: Result<Report, &'static str>, remove: impl FnOnce(&Path) -> std::io::Result<()> + Send + 'static) -> Result<Report, &'static str> {
        // Worker owns only process cleanup, never the host-operation/discovery lease.
        let (send, receive) = std::sync::mpsc::sync_channel(1);
        std::thread::spawn(move || { let cleaned=io.cleanup_with(remove); let _=send.send(cleaned); });
        await_cleanup(result, receive, Duration::from_secs(2), &CLEANUP_QUARANTINED)
    }
    fn await_cleanup(result: Result<Report, &'static str>, receive: std::sync::mpsc::Receiver<bool>, timeout: Duration, quarantine: &AtomicBool) -> Result<Report, &'static str> {
        match receive.recv_timeout(timeout) {
            Ok(cleaned) => with_cleanup(result, cleaned),
            Err(_) => { quarantine.store(true, Ordering::SeqCst); Err("DISCOVERY_CLEANUP_PENDING") }
        }
    }
    #[test] fn discovery_stalled_cleanup_is_bounded_and_quarantined() {
        let (send, receive)=std::sync::mpsc::sync_channel(1);
        let quarantine=AtomicBool::new(false);
        assert_eq!(await_cleanup(Err("DISCOVERY_CANCELLED"),receive,Duration::ZERO,&quarantine).unwrap_err(),"DISCOVERY_CLEANUP_PENDING");
        assert!(quarantine.load(Ordering::SeqCst));
        assert!(send.send(true).is_err()); // Late completion cannot replace the error.
    }
    impl Drop for Process { fn drop(&mut self) { if !self.cleaned { let _ = self.cleanup(); } } }
    impl Transport for Process {
        fn send(&mut self, message: &Value) -> Result<(), &'static str> {
            let mut bytes = serde_json::to_vec(message).map_err(|_| "DISCOVERY_PROTOCOL_ERROR")?; bytes.push(b'\n');
            self.input.write_all(&bytes).map_err(|_| "DISCOVERY_TRANSPORT_ERROR")
        }
        fn receive(&mut self, deadline: Instant, cancelled: &AtomicBool) -> Result<Value, &'static str> {
            loop {
                check(deadline, cancelled)?;
                if let Some(end) = self.pending.iter().position(|c| *c == b'\n') {
                    let line = self.pending.drain(..=end).collect::<Vec<_>>();
                    return serde_json::from_slice(&line).map_err(|_| "DISCOVERY_PROTOCOL_ERROR");
                }
                let mut chunk = [0u8; 4096];
                match self.output.read(&mut chunk) {
                    Ok(0) => return Err("DISCOVERY_TRANSPORT_ERROR"),
                    Ok(n) => { self.total += n; self.pending.extend_from_slice(&chunk[..n]); if self.total > MAX_BYTES || self.pending.len() > MAX_LINE { return Err("DISCOVERY_LIMIT"); } }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(10)),
                    Err(_) => return Err("DISCOVERY_TRANSPORT_ERROR"),
                }
            }
        }
    }
    pub(super) fn run(executable: &Path, request: &Request, cancelled: &AtomicBool) -> Result<Report, &'static str> {
        run_with_remover(executable, request, cancelled, |path| std::fs::remove_dir_all(path))
    }
    pub(super) fn run_with_remover(executable: &Path, request: &Request, cancelled: &AtomicBool, remove: impl FnOnce(&Path) -> std::io::Result<()> + Send + 'static) -> Result<Report, &'static str> {
        if !executable.is_absolute() || !executable.is_file() { return Err("DISCOVERY_UNSUPPORTED"); }
        check(Instant::now() + TIMEOUT, cancelled)?;
        let nonce = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|_| "DISCOVERY_TRANSPORT_ERROR")?.as_nanos();
        let home = std::env::temp_dir().join(format!("rivune-model-discovery-{}-{nonce}", std::process::id()));
        std::fs::create_dir(&home).map_err(|_| "DISCOVERY_TRANSPORT_ERROR")?;
        let child = Command::new(executable).args(["app-server","--listen","stdio://","-c","cli_auth_credentials_store=\"file\"","-c","analytics.enabled=false"])
            .env_clear().env("HOME",&home).env("CODEX_HOME",&home).env("PATH","/usr/bin:/bin").current_dir(&home)
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).process_group(0).spawn();
        let mut child = match child { Ok(child) => child, Err(_) => { let cleaned=std::fs::remove_dir_all(home).is_ok(); return with_cleanup(Err("DISCOVERY_TRANSPORT_ERROR"), cleaned); } };
        let input = child.stdin.take().expect("piped stdin"); let output = child.stdout.take().expect("piped stdout");
        let mut io = Process { child, input, output, home, pending:vec![], total:0, cleaned:false };
        for fd in [io.output.as_raw_fd(), io.input.as_raw_fd()] {
            let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
            if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 { return finish(io, Err("DISCOVERY_TRANSPORT_ERROR"), remove); }
        }
        let result = session(&mut io, request, cancelled, TIMEOUT);
        finish(io, result, remove).and_then(|report| {
            if cancelled.load(Ordering::SeqCst) { Err("DISCOVERY_CANCELLED") } else { Ok(report) }
        })
    }
}
pub fn discover(executable: &Path, request: &Request, cancelled: &AtomicBool) -> Report {
    #[cfg(unix)] let result = process::run(executable, request, cancelled);
    #[cfg(not(unix))] let result: Result<Report, &'static str> = { let _=(executable,cancelled); Err("DISCOVERY_UNSUPPORTED") };
    result.unwrap_or_else(|code| Report::failure(request, code))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;
    struct Fake { replies: VecDeque<Value>, sent: Vec<Value> }
    impl Transport for Fake {
        fn send(&mut self, value: &Value) -> Result<(), &'static str> { self.sent.push(value.clone()); Ok(()) }
        fn receive(&mut self, deadline: Instant, cancelled: &AtomicBool) -> Result<Value, &'static str> { check(deadline,cancelled)?; self.replies.pop_front().ok_or("DISCOVERY_TRANSPORT_ERROR") }
    }
    fn request() -> Request { Request { request_id:"synthetic-request".into(), provider_id:"synthetic-codex-route".into() } }
    fn model(id: &str) -> Value { json!({"id":id,"model":format!("wire-{id}"),"displayName":"Synthetic model","hidden":false,"isDefault":true,"supportedReasoningEfforts":[{"reasoningEffort":"future-effort","description":"Synthetic"}],"defaultReasoningEffort":"future-effort","futureAdditiveField":true}) }
    fn fixture(page: Value) -> Fake { Fake { replies:vec![json!({"id":1,"result":{"userAgent":"synthetic-app-server/0.153.4","future":true}}),json!({"id":2,"result":{"account":null,"requiresOpenaiAuth":true}}),json!({"id":3,"result":page})].into(), sent:vec![] } }
    fn run(fake:&mut Fake) -> Result<Report,&'static str> { session(fake,&request(),&AtomicBool::new(false),Duration::from_secs(1)) }
    #[test] fn discovery_protocol_preserves_ids_efforts_and_unauthenticated_state() {
        let mut f=fixture(json!({"data":[model("synthetic-a")]})); let report=run(&mut f).unwrap();
        assert_eq!(report.state,"unauthenticated"); assert!(!report.selection_enabled); assert_eq!(report.authentication,"notAuthenticated");
        assert_eq!(report.models[0].id,"synthetic-a"); assert_eq!(report.models[0].model,"wire-synthetic-a"); assert_eq!(report.models[0].reasoning_efforts,vec!["future-effort"]);
        assert_eq!(f.sent.iter().map(|v|v["method"].as_str().unwrap()).collect::<Vec<_>>(),vec!["initialize","initialized","account/read","model/list"]);
        assert_eq!(f.sent[2]["params"],json!({"refreshToken":false})); assert_eq!(f.sent[3]["params"]["includeHidden"],false);
    }
    #[test] fn discovery_pagination_filters_hidden_and_rejects_duplicate_or_cyclic_results() {
        let mut hidden=model("hidden");hidden["hidden"]=json!(true);
        let mut f=fixture(json!({"data":[hidden],"nextCursor":"page-2"}));f.replies.push_back(json!({"id":4,"result":{"data":[model("visible")],"nextCursor":null}}));
        let report=run(&mut f).unwrap();assert_eq!(report.models.len(),1);assert_eq!(f.sent[4]["params"]["cursor"],"page-2");
        for duplicate in [true,false] { let mut f=fixture(json!({"data":[model("same")],"nextCursor":"cycle"}));f.replies.push_back(json!({"id":4,"result":{"data":[model(if duplicate {"same"} else {"other"})],"nextCursor":"cycle"}}));assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_PROTOCOL_ERROR"); }
    }
    #[test] fn discovery_unknown_method_malformed_core_and_server_requests_fail_closed() {
        let mut f=fixture(json!({"data":[]}));f.replies[2]=json!({"id":3,"error":{"code":-32601,"message":"private error must not be copied"}});assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_UNSUPPORTED");
        for response in [json!({"id":99,"result":{"data":[]}}),json!({"id":3,"method":"account/chatgptAuthTokens/refresh","params":{}}),json!({"id":3,"result":{"data":[{"id":"incomplete"}]}})] { let mut f=fixture(json!({"data":[]}));f.replies[2]=response;assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_PROTOCOL_ERROR");assert_eq!(f.sent.len(),4); }
    }
    #[test] fn discovery_never_promotes_authenticated_or_invalid_default_data() {
        let mut f=fixture(json!({"data":[]}));f.replies[1]["result"]["account"]=json!({"type":"chatgpt","email":"synthetic@example.invalid"});assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_ISOLATION_VIOLATION");assert_eq!(f.sent.len(),3);
        let mut invalid=model("synthetic");invalid["defaultReasoningEffort"]=json!("not-advertised");assert_eq!(run(&mut fixture(json!({"data":[invalid]}))).unwrap_err(),"DISCOVERY_PROTOCOL_ERROR");
    }
    #[test] fn discovery_cancellation_deadline_and_page_bounds_drop_partial_data() {
        let mut f=fixture(json!({"data":[]}));assert_eq!(session(&mut f,&request(),&AtomicBool::new(true),TIMEOUT).unwrap_err(),"DISCOVERY_CANCELLED");assert!(f.sent.is_empty());
        assert_eq!(session(&mut f,&request(),&AtomicBool::new(false),Duration::ZERO).unwrap_err(),"DISCOVERY_TIMEOUT");
        let mut f=fixture(json!({"data":[] ,"nextCursor":"c0"}));for i in 1..4 {f.replies.push_back(json!({"id":3+i,"result":{"data":[],"nextCursor":format!("c{i}")}}));}assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_LIMIT");
        let mut f=fixture(json!({"data":(0..33).map(|i|model(&format!("m{i}"))).collect::<Vec<_>>()}));assert_eq!(run(&mut f).unwrap_err(),"DISCOVERY_LIMIT");
    }
    #[test] fn discovery_cancel_before_during_after_registration_is_fenced() {
        let mut registry=Registry::default();
        assert!(registry.cancel("before"));
        assert!(matches!(registry.begin("before"),Err("DISCOVERY_CANCELLED")));
        let token=registry.begin("during").unwrap();
        assert!(matches!(registry.begin("other"),Err("DISCOVERY_BUSY")));
        assert!(registry.cancel("different"));assert!(!token.load(Ordering::SeqCst));
        assert!(registry.cancel("during"));assert!(token.load(Ordering::SeqCst));
        registry.finish("during");assert!(matches!(registry.begin("during"),Err("DISCOVERY_CANCELLED")));
        registry.begin("finished").unwrap();registry.finish("finished");
        assert!(matches!(registry.begin("finished"),Err("DISCOVERY_ID_REUSED")));
        assert!(registry.cancel("finished"));assert!(matches!(registry.begin("finished"),Err("DISCOVERY_CANCELLED")));
        let fresh=registry.begin("fresh").unwrap();assert!(!fresh.load(Ordering::SeqCst));
    }
    #[test] fn discovery_public_lease_fences_cancel_and_reuse() {
        let _serial=TEST_REGISTRY_LOCK.lock().unwrap();
        assert!(cancel("public-before"));
        let before=Request {request_id:"public-before".into(),provider_id:"synthetic".into()};
        assert!(matches!(begin(&before),Err("DISCOVERY_CANCELLED")));
        let r=Request {request_id:"public-during".into(),provider_id:"synthetic".into()};
        let lease=begin(&r).unwrap();assert!(cancel(&r.request_id));
        assert!(lease.cancelled.load(Ordering::SeqCst));drop(lease);
        assert!(matches!(begin(&r),Err("DISCOVERY_CANCELLED")));
    }
    #[test] fn discovery_public_admission_rechecks_quarantine_after_active_lease_release() {
        let _serial=TEST_REGISTRY_LOCK.lock().unwrap();
        struct Reset; impl Drop for Reset { fn drop(&mut self) { CLEANUP_QUARANTINED.store(false,Ordering::SeqCst); } }
        let _reset=Reset;
        let a=Request { request_id:"quarantine-active-a".into(),provider_id:"synthetic".into() };
        let lease=begin(&a).unwrap();
        let ready=Arc::new(std::sync::Barrier::new(2));let resume=Arc::new(std::sync::Barrier::new(2));
        let (b_ready,b_resume)=(ready.clone(),resume.clone());
        let contender=std::thread::spawn(move || {
            BEGIN_BARRIERS.with(|slot| *slot.borrow_mut()=Some((b_ready,b_resume)));
            let b=Request { request_id:"quarantine-contender-b".into(),provider_id:"synthetic".into() };
            begin(&b).map(|_| ())
        });
        ready.wait(); // B passed the fast check, but cannot reach admission yet.
        CLEANUP_QUARANTINED.store(true,Ordering::SeqCst);
        drop(lease); // A releases the actual public lease and admission mutex.
        resume.wait();
        assert_eq!(contender.join().unwrap(),Err("DISCOVERY_CLEANUP_PENDING"));
        let registry=REGISTRY.lock().unwrap();let registry=registry.as_ref().unwrap();
        assert!(registry.active.is_none());assert!(!registry.identities.contains_key("quarantine-contender-b"));
    }
    #[test] fn discovery_identity_capacity_never_evicts_cancellation_fences() {
        let mut registry=Registry::default();
        for i in 0..MAX_REQUEST_IDENTITIES { assert!(registry.cancel(&format!("id-{i}"))); }
        assert!(!registry.cancel("overflow"));
        assert!(matches!(registry.begin("overflow"),Err("DISCOVERY_IDENTITY_LIMIT")));
        assert!(matches!(registry.begin("id-0"),Err("DISCOVERY_CANCELLED")));
    }
    #[test] fn discovery_cleanup_failure_is_sanitized_and_discards_results() {
        let mut fake=fixture(json!({"data":[model("synthetic")]}));
        assert_eq!(with_cleanup(run(&mut fake),false).unwrap_err(),"DISCOVERY_CLEANUP_FAILED");
        assert_eq!(with_cleanup::<Report>(Err("DISCOVERY_CANCELLED"),false).unwrap_err(),"DISCOVERY_CLEANUP_FAILED");
        let report=Report::failure(&request(),"DISCOVERY_CLEANUP_FAILED");
        assert_eq!(report.state,"error");assert!(report.models.is_empty());assert!(!report.selection_enabled);
        let wire=serde_json::to_string(&report).unwrap();assert!(!wire.contains("/tmp"));assert!(!wire.contains("stderr"));
    }
    #[cfg(unix)]
    #[test] fn discovery_synthetic_stdio_frames_success_and_output_limit() {
        use std::os::unix::fs::PermissionsExt;
        for mode in 0..4 {
            let flood = mode == 1;
            let nonce=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
            let dir=std::env::temp_dir().join(format!("rivune-discovery-wire-{nonce}"));std::fs::create_dir(&dir).unwrap();let script=dir.join("fake-codex");let marker=dir.join("process.json");
            let source=format!(r#"#!/usr/bin/python3
import os,json,sys
with open({marker},'w') as f: json.dump({{'pid':os.getpid(),'home':os.environ['HOME']}},f)
for line in sys.stdin:
 r=json.loads(line);m=r['method']
 assert m in ['initialize','initialized','account/read','model/list']
 if m=='initialized': continue
 if {flood}: sys.stdout.write('x'*300000);sys.stdout.flush();continue
 if m=='initialize': result={{'userAgent':'synthetic/0.153.4'}}
 elif m=='account/read':
  assert r['params']=={{'refreshToken':False}}
  result={{'account':None,'requiresOpenaiAuth':True}}
 else: result={{'data':[],'nextCursor':None}}
 response=json.dumps({{'id':r['id'],'result':result}})+'\n'
 sys.stdout.write(response[:5]);sys.stdout.flush();sys.stdout.write(response[5:]);sys.stdout.flush()
"#,marker=serde_json::to_string(&marker.to_string_lossy()).unwrap(),flood=if flood {"True"} else {"False"});
            std::fs::write(&script,source).unwrap();std::fs::set_permissions(&script,std::fs::Permissions::from_mode(0o700)).unwrap();
            assert_eq!(discover(&script,&request(),&AtomicBool::new(true)).state,"cancelled");
            assert!(!marker.exists());
            let report=if mode == 3 {
                let token=Arc::new(AtomicBool::new(false));let during_cleanup=token.clone();
                let result=process::run_with_remover(&script,&request(),&token, move |path| { let removed=std::fs::remove_dir_all(path);during_cleanup.store(true,Ordering::SeqCst);removed });
                assert_eq!(result.unwrap_err(),"DISCOVERY_CANCELLED");Report::failure(&request(),"DISCOVERY_CANCELLED")
            } else if mode == 2 {
                let result=process::run_with_remover(&script,&request(),&AtomicBool::new(false), |_| Err(std::io::Error::new(std::io::ErrorKind::PermissionDenied,"synthetic private path must not escape")));
                assert_eq!(result.unwrap_err(),"DISCOVERY_CLEANUP_FAILED");
                Report::failure(&request(),"DISCOVERY_CLEANUP_FAILED")
            } else { discover(&script,&request(),&AtomicBool::new(false)) };
            if mode >= 2 { assert!(report.models.is_empty());assert!(!report.selection_enabled); }
            else if flood { assert_eq!(report.error_code,Some("DISCOVERY_LIMIT")); } else { assert_eq!(report.state,"unauthenticated"); }
            let data:Value=serde_json::from_slice(&std::fs::read(marker).unwrap()).unwrap();assert_eq!(unsafe{libc::kill(data["pid"].as_i64().unwrap() as i32,0)},-1);
            let home=Path::new(data["home"].as_str().unwrap());
            if mode == 2 { assert!(home.exists());std::fs::remove_dir_all(home).unwrap(); }
            assert!(!home.exists());std::fs::remove_dir_all(dir).unwrap();
        }
    }
    #[cfg(unix)]
    #[test] fn discovery_synthetic_process_is_isolated_cancelled_and_reaped() {
        use std::os::unix::fs::PermissionsExt;
        let nonce=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let dir=std::env::temp_dir().join(format!("rivune-discovery-fixture-{nonce}"));std::fs::create_dir(&dir).unwrap();let script=dir.join("fake-codex");let marker=dir.join("process.json");
        let source=format!(r#"#!/usr/bin/python3
import os,json,time,sys
assert os.environ['HOME']==os.environ['CODEX_HOME']
assert 'OPENAI_API_KEY' not in os.environ
assert sys.argv[1:4]==['app-server','--listen','stdio://']
with open({marker},'w') as f: json.dump({{'pid':os.getpid(),'home':os.environ['HOME']}},f)
while True: time.sleep(.02)
"#,marker=serde_json::to_string(&marker.to_string_lossy()).unwrap());
        std::fs::write(&script,source).unwrap();std::fs::set_permissions(&script,std::fs::Permissions::from_mode(0o700)).unwrap();
        let cancelled=Arc::new(AtomicBool::new(false));let token=cancelled.clone();let started=marker.clone();
        let stopper=std::thread::spawn(move||{
            for _ in 0..400 {
                if std::fs::read(&started).ok().and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok()).is_some() { break; }
                std::thread::sleep(Duration::from_millis(10));
            }
            token.store(true,Ordering::SeqCst);
        });
        let report=discover(&script,&request(),&cancelled);stopper.join().unwrap();assert_eq!(report.state,"cancelled");
        let data:Value=serde_json::from_slice(&std::fs::read(&marker).unwrap()).unwrap();let pid=data["pid"].as_i64().unwrap() as i32;
        assert_eq!(unsafe{libc::kill(pid,0)},-1);assert!(!Path::new(data["home"].as_str().unwrap()).exists());std::fs::remove_dir_all(dir).unwrap();
    }
}
