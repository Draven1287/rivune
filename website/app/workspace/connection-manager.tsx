"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateAPIFields, type APIEntry, type APIProvider, type ConnectionMethod, type ConnectionSettings, type ConnectionSettingsRequest } from "./connections-contract";
import type { WorkspaceSnapshot } from "./client-contract";
import ProviderMark from "./provider-mark";
import Icon from "./workspace-icon";
import "./connection-manager.css";

function APIForm({ entry, request, disabled, onSaved }: { entry: APIEntry; request?: ConnectionSettingsRequest; disabled: boolean; onSaved:(result:ConnectionSettings)=>void }) {
  const [apiKey, setApiKey] = useState("");
  const [modelID, setModelID] = useState(entry.modelID ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || disabled || busy) return;
    const key = apiKey.trim(), model = modelID.trim();
    const invalid = validateAPIFields(key, model, entry.hasKey);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(""); setApiKey("");
    try {
      const result = await request("/v1/connections/api", { provider: entry.provider, apiKey: key, modelID: model });
      if (active.current) onSaved(result);
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : "Could not save this API connection."); }
    finally { if (active.current) setBusy(false); }
  };
  return <form className="rv-connect-form" onSubmit={save} autoComplete="off">
    <label>API key<input type="password" aria-label={`${entry.title} API key`} autoComplete="new-password" spellCheck={false} maxLength={4096} value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={entry.hasKey ? "Saved on Mac · leave blank to keep" : "Paste your provider API key"} disabled={disabled || busy || !request} /></label>
    <label>Model ID<input aria-label={`${entry.title} model ID`} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={256} value={modelID} onChange={event => setModelID(event.target.value)} placeholder="Exact model ID from your provider" disabled={disabled || busy || !request} /></label>
    <p><Icon name="shield" size={14} />Stored in your Mac’s Keychain. API usage is billed by the provider.</p>
    {error && <div className="rv-connect-feedback" role="alert">{error}</div>}
    <button className="rv-connect-primary" disabled={disabled || busy || !request || !modelID.trim() || (!apiKey.trim() && !entry.hasKey)}>{busy ? "Saving…" : "Save & check API"}<Icon name="chevron" size={13} /></button>
  </form>;
}

export default function ConnectionManager({ request, snapshot, online, onPair, onNative, locked = false, initialMethod = "cli" }: {
  request?: ConnectionSettingsRequest; snapshot: WorkspaceSnapshot | null; online: boolean; onPair:()=>void; onNative?:()=>void; locked?:boolean; initialMethod?:ConnectionMethod;
}) {
  const [method, setMethod] = useState<ConnectionMethod>(initialMethod);
  const [provider, setProvider] = useState<APIProvider>("openai");
  const [data, setData] = useState<ConnectionSettings | null>(null);
  const [busy, setBusy] = useState(!!request);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [executable, setExecutable] = useState("");
  const [adding, setAdding] = useState(false);
  const [sessionRequest, setSessionRequest] = useState(() => request);
  // A pairing change must synchronously discard sensitive child form state,
  // before the replacement connection's asynchronous load begins.
  if (sessionRequest !== request) {
    setSessionRequest(() => request);
    setData(null); setNotice(""); setTitle(""); setExecutable(""); setAdding(false); setBusy(!!request);
  }
  const requestRef = useRef(request);
  useEffect(() => {
    requestRef.current = request;
    let current = true;
    if (!request) return () => { current = false; };
    request("/v1/connections").then(result => { if (current) setData(result); })
      .catch(err => { if (current) setNotice(err instanceof Error ? err.message : "Could not load connections."); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [request]);
  const scan = async () => {
    if (!request || busy) return;
    setBusy(true); setNotice("");
    try { const result = await request("/v1/connections/scan"); if (requestRef.current === request) { setData(result); setNotice("Scan complete. No CLI was launched."); } }
    catch (err) { if (requestRef.current === request) setNotice(err instanceof Error ? err.message : "Could not scan this Mac."); }
    finally { if (requestRef.current === request) setBusy(false); }
  };
  const add = async (event:FormEvent) => {
    event.preventDefault(); if (!request || busy || locked) return;
    setBusy(true); setNotice("");
    try { const result = await request("/v1/connections/cli", {title:title.trim(),executable:executable.trim()}); if (requestRef.current === request) { setData(result); setNotice(result.message || "CLI added."); setTitle(""); setExecutable(""); setAdding(false); } }
    catch (err) { if (requestRef.current === request) setNotice(err instanceof Error ? err.message : "Could not add this CLI."); }
    finally { if (requestRef.current === request) setBusy(false); }
  };
  const cli = data?.cli ?? [{id:"codex",title:"ChatGPT",command:"codex",isDefault:true,installed:false,supported:true,custom:false},{id:"claude",title:"Claude",command:"claude",isDefault:true,installed:false,supported:true,custom:false}];
  const api = data?.api.find(item => item.provider === provider) ?? {provider,title:provider === "openai" ? "OpenAI" : "Anthropic",hasKey:false};
  const checks = snapshot?.connectionChecks ?? snapshot?.connections ?? [];
  return <section className="rv-connection-manager" aria-label="AI connection setup">
    <div className="rv-connect-tabs" role="group" aria-label="Configure a connection">
      <button type="button" aria-pressed={method === "cli"} onClick={() => { setMethod("cli"); setNotice(""); }}><Icon name="terminal" size={18} /><span>CLI tools</span></button>
      <button type="button" aria-pressed={method === "api"} onClick={() => { setMethod("api"); setNotice(""); }}><Icon name="key" size={18} /><span>API key</span></button>
    </div>
    {!request && <div className="rv-connect-pair"><ProviderMark mode="rivune" /><div><strong>{online ? "Update your Mac app" : "Link Rivune on this Mac"}</strong><p>{online ? "Open Connections in the Mac app, or update it to configure providers here." : "The Mac app finds CLI tools and stores API keys. Connect it to manage them in this browser session."}</p></div><button type="button" onClick={online && onNative ? onNative : onPair}>{online ? "Open settings" : "Connect Mac"}<Icon name="chevron" size={12} /></button></div>}
    {method === "cli" ? <>
      <header className="rv-connect-section"><div><h3>Your CLI tools</h3><p>Defaults, plus AI tools found on your Mac.</p></div><button type="button" onClick={() => void scan()} disabled={!request || busy}><Icon name="replay" size={13} />{busy ? "Scanning…" : "Scan Mac"}</button></header>
      <div className="rv-connect-cli-list">{cli.map(item => {
        const check = checks.find(check => check.provider === item.command && check.transport === "cli");
        const status = !data ? "Not checked" : !item.installed ? "Not found" : !item.supported ? "Adapter needed" : check?.state === "ready" ? "Signed in" : check?.state === "checking" ? "Checking" : "Installed";
        return <div key={item.id}>{item.isDefault ? <ProviderMark mode={item.command === "claude" ? "claude" : "codex"} /> : <span className="rv-connect-terminal"><Icon name="terminal" size={17} /></span>}<span><strong>{item.title}{item.isDefault && <small>Default</small>}</strong><code>{item.command}</code></span><span className={status === "Signed in" ? "is-ready" : ""}>{status}</span></div>;
      })}</div>
      <div className="rv-connect-actions"><button type="button" onClick={() => setAdding(!adding)} aria-expanded={adding} disabled={!request || locked}><Icon name="plus" size={14} />Add another CLI</button>{onNative && online && <button type="button" onClick={onNative}>Sign-in settings <Icon name="external" size={12} /></button>}</div>
      {adding && <form className="rv-connect-form rv-connect-add" onSubmit={add}><label>Tool name<input value={title} onChange={event => setTitle(event.target.value)} placeholder="My AI tool" maxLength={60} required disabled={busy || locked} /></label><label>Executable<input value={executable} onChange={event => setExecutable(event.target.value)} placeholder="Command name or full path" maxLength={2048} autoCapitalize="none" autoComplete="off" spellCheck={false} required disabled={busy || locked} /></label><button className="rv-connect-primary" disabled={busy || locked || !title.trim() || !executable.trim()}>Add CLI</button></form>}
      <details className="rv-connect-help"><summary>About CLI discovery</summary><p>Scans common install locations without launching tools. Additional tools need a compatible adapter before they can chat.</p></details>
    </> : <>
      <header className="rv-connect-section"><div><h3>Connect an API</h3><p>Choose a provider, then add your key and model.</p></div></header>
      <label className="rv-connect-provider-label">Provider<select value={provider} onChange={event => {setProvider(event.target.value as APIProvider); setNotice("");}}><option value="openai">OpenAI · ChatGPT</option><option value="anthropic">Anthropic · Claude</option></select></label>
      <APIForm key={`${provider}-${data ? "paired" : "unpaired"}`} entry={api} request={data ? request : undefined} disabled={locked || busy} onSaved={result => {setData(result); setNotice(result.message || "API saved on your Mac.");}} />
    </>}
    {locked && <p className="rv-connect-feedback" role="status">Connection changes are locked while a task or access check is running.</p>}
    {notice && <p className="rv-connect-feedback" role="status">{notice}</p>}
    <p className="rv-connect-routing">Automatic routing: a ready CLI first, otherwise API.</p>
  </section>;
}
