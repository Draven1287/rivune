"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { startupState, type WorkspaceSnapshot } from "./client-contract";
import ProviderMark from "./provider-mark";
import { SpaceField } from "./startup";
import ConnectionManager from "./connection-manager";
import type { ConnectionSettingsRequest } from "./connections-contract";
import "./setup.css";

export type AccountMethod = "google" | "apple" | "email";
export type AccountAccess = {
  methods?: AccountMethod[];
  account?: { id: string; name?: string; email?: string } | null;
  loading?: boolean; busy?: boolean; error?: string | null; notice?: string | null;
  signOutPending?: boolean;
  emailChallenge?: { email: string; codeLength?: number } | null;
  onSignIn?: (method: AccountMethod, email?: string) => void;
  onVerifyEmail?: (code: string) => void;
  onCancelEmail?: () => void;
  onSignOut?: () => void;
  allowLocal?: boolean;
};

type SetupStep = "account" | "connections" | "ready";
const subscribe = () => () => {};
function useLocalBuild() {
  return useSyncExternalStore(subscribe, () => ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname), () => false);
}
function SetupIcon({ name, size = 20 }: { name: "arrow" | "back" | "terminal" | "key" | "check" | "mail" | "shield" | "link"; size?: number }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
    key: <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9m-4-4 2-2m-5-1 2-2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    link: <><path d="m9 15 6-6M9 17l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m2-3 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z" /><path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" /></svg>;
}

function AccountStep({ access, allowLocal, onLocal }: { access: AccountAccess; allowLocal: boolean; onLocal: () => void }) {
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const configured = access.methods?.length;
  const emailAvailable = access.methods?.includes("email") && !!access.onSignIn;
  const startEmail = (event: FormEvent) => { event.preventDefault(); if (emailAvailable && !access.busy) access.onSignIn?.("email", email.trim()); };
  const verifyEmail = (event: FormEvent) => { event.preventDefault(); if (!access.busy) access.onVerifyEmail?.(code.trim()); };
  return <div className="ws-setup-account-content">
    <p className="ws-setup-eyebrow">YOUR RIVUNE ACCOUNT</p><h1 id="ws-setup-title" tabIndex={-1}>A space that’s yours.</h1><p className="ws-setup-description">Choose how you’d like to sign in. Then bring your favorite AI into the workspace.</p>
    {access.signOutPending ? <div className="ws-setup-email"><p>Local sign-out could not confirm removal of this tab’s saved session. Your account stays hidden, and no remote account or AI-provider access was revoked.</p><button className="ws-setup-primary" disabled={access.busy || !access.onSignOut} onClick={access.onSignOut}>{access.busy ? "Signing out…" : "Retry local sign-out"}<SetupIcon name="arrow" size={17} /></button></div> : access.loading ? <div className="ws-setup-info" role="status">Checking your account session…</div> : access.emailChallenge ? <form className="ws-setup-email" onSubmit={verifyEmail}><label htmlFor="rivune-email-code">Check your email</label><p>Open the sign-in link sent to <strong>{access.emailChallenge.email}</strong> in this browser tab.</p><details><summary>My email contains a code instead</summary><input id="rivune-email-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]+" minLength={access.emailChallenge.codeLength ?? 6} maxLength={access.emailChallenge.codeLength ?? 8} placeholder="Verification code" value={code} onChange={event => setCode(event.target.value)} required /><button className="ws-setup-primary" disabled={access.busy || !access.onVerifyEmail || !code.trim()}>{access.busy ? "Verifying…" : "Verify email"}<SetupIcon name="arrow" size={17} /></button></details>{access.onCancelEmail && <button className="ws-setup-text-button" type="button" disabled={access.busy || access.loading} onClick={() => { access.onCancelEmail?.(); setCode(""); }}>Use another email</button>}</form> : <>
      <div className="ws-setup-signin-options">{(["google", "apple", "email"] as const).map(method => {
        const available = !!access.methods?.includes(method) && !!access.onSignIn;
        return <button key={method} disabled={!available || access.busy} onClick={() => method === "email" ? setEmailMode(true) : access.onSignIn?.(method)}>{method === "google" ? <GoogleMark /> : method === "apple" ? <span className="ws-apple-mark" aria-hidden="true" /> : <SetupIcon name="mail" size={19} />}<span>Continue with {method === "google" ? "Google" : method === "apple" ? "Apple" : "email"}</span>{!available && <small>Not configured</small>}</button>;
      })}</div>
      {emailMode && emailAvailable && <form className="ws-setup-email" onSubmit={startEmail}><label htmlFor="rivune-account-email">Email address</label><input id="rivune-account-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required /><button className="ws-setup-primary" disabled={access.busy || !email.trim()}>{access.busy ? "Sending…" : "Send a sign-in link"}<SetupIcon name="arrow" size={17} /></button></form>}
    </>}
    {access.error && <p className="ws-setup-error" role="alert">{access.error}</p>}{access.notice && <p className="ws-setup-info" role="status">{access.notice}</p>}
    {!configured && !access.loading && <p className="ws-setup-local-note">Account sign-in isn’t configured yet. No account has been created.</p>}
    {allowLocal && <div className="ws-setup-local"><span>LOCAL DEVELOPMENT</span><button className="ws-setup-primary" onClick={onLocal} disabled={access.busy || access.loading}>Continue locally<SetupIcon name="arrow" size={17} /></button><p>Use this Mac workspace without a cloud account.</p></div>}
    <p className="ws-setup-account-footnote"><SetupIcon name="shield" size={15} />Your Rivune account is separate from your AI provider accounts.</p>
  </div>;
}

export default function WorkspaceSetup({ open, accountAccess, snapshot, online, checking, onPairMac, onRecheck, onEnter, onPreview, connectionRequest, onNativeConnections, locked }: {
  open: boolean; accountAccess?: AccountAccess; snapshot: WorkspaceSnapshot | null; online: boolean; checking: boolean;
  connectionRequest?: ConnectionSettingsRequest; onNativeConnections?: () => void; locked?: boolean;
  onPairMac: () => void; onRecheck: () => void; onEnter: () => void; onPreview: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<SetupStep>("account");
  const [localChoice, setLocalChoice] = useState(false);
  const isLocalBuild = useLocalBuild();
  const access = accountAccess ?? {};
  const allowLocal = access.allowLocal ?? (!access.methods?.length && isLocalBuild);
  const accepted = !access.loading && (!!access.account || (allowLocal && localChoice));
  const step: SetupStep = !accepted ? "account" : stage === "account" ? "connections" : stage;
  const readiness = startupState(snapshot, online, checking);
  const ready = readiness.phase === "ready";
  const readyProviders = (snapshot?.connections ?? []).filter(item => item.state === "ready" && ["codex", "claude"].includes(item.provider));
  const steps = ["account", "connections", "ready"] as const;
  useEffect(() => {
    const page = dialog.current;
    if (!page) return;
    if (open) {
      if (!page.open) page.showModal();
      page.querySelector<HTMLHeadingElement>("#ws-setup-title")?.focus({ preventScroll: true });
      page.scrollTop = 0;
    } else page.close();
  }, [open, step]);
  const enter = () => { if (accepted && ready && !access.busy) onEnter(); };
  return <dialog ref={dialog} className="ws-setup" aria-labelledby="ws-setup-title" onCancel={event => { event.preventDefault(); if (allowLocal) onPreview(); }}>
    <SpaceField /><div className="ws-setup-cosmos" aria-hidden="true" />
    <header className="ws-setup-header"><div className="ws-setup-brand"><ProviderMark mode="rivune" /><span className="rivune-wordmark" role="img" aria-label="Rivune">Rivune</span></div>{allowLocal && <button onClick={onPreview}>Preview workspace<span aria-hidden="true">↗</span></button>}</header>
    <div className="ws-setup-layout"><aside className="ws-setup-story"><span className="ws-setup-story-mark"><ProviderMark mode="rivune" /></span><p>YOUR NEXT CHAPTER</p><h2>More perspective.<br />More possibility.</h2><span>Bring your ideas and your intelligence.<br />We’ll make room for both.</span><ol aria-label="Setup progress">{steps.map((item, index) => {
      const completed = index < steps.indexOf(step);
      return <li key={item} className={step === item ? "is-current" : completed ? "is-complete" : ""}><span>{completed ? <SetupIcon name="check" size={14} /> : `0${index + 1}`}</span><div><strong>{item === "account" ? "Your account" : item === "connections" ? "Connect your AI" : "Ready to begin"}</strong><small>{item === "account" ? "A place of your own" : item === "connections" ? "CLI sign-in or API key" : "Your first conversation"}</small></div></li>;
    })}</ol><div className="ws-setup-story-footnote"><SetupIcon name="shield" size={16} /><span>Provider keys and CLI sign-ins stay on your Mac.</span></div></aside>
      <section className={`ws-setup-card ws-setup-card--${step}`}>
        {step === "account" ? <AccountStep access={access} allowLocal={allowLocal} onLocal={() => { setLocalChoice(true); setStage("connections"); }} /> : step === "connections" ? <>
          <div className="ws-setup-account-badge"><span className="ws-setup-account-avatar"><ProviderMark mode="rivune" /></span><div><strong>{access.account?.name || access.account?.email || "Local workspace"}</strong><small>{access.account ? "Signed in to Rivune" : "Local development · no account"}</small></div>{access.account && access.onSignOut ? <button disabled={access.busy} onClick={() => { setLocalChoice(false); setStage("account"); access.onSignOut?.(); }}>Sign out</button> : <button onClick={() => { setLocalChoice(false); setStage("account"); }}>Change</button>}</div>
          <p className="ws-setup-eyebrow">CONNECT YOUR INTELLIGENCE</p><h1 id="ws-setup-title" tabIndex={-1}>Your AI. Your choice.</h1><p className="ws-setup-description">Use an existing CLI sign-in or connect an API key. One working provider is enough to start.</p>
          <ConnectionManager request={connectionRequest} snapshot={snapshot} online={online} onPair={onPairMac} onNative={onNativeConnections} locked={locked || checking} />
          {online && <div className="ws-setup-pairing"><span><i className="is-ready" />Paired with {snapshot?.device.name || "your Mac"}</span><button onClick={onPairMac}>Manage pairing<SetupIcon name="link" size={14} /></button></div>}
          <div className="ws-setup-check-status" role="status">{readiness.phase === "checking" ? "Checking your CLI sign-ins and API model access…" : ready ? `${readyProviders.length === 2 ? "Both providers are" : "One provider is"} ready. You can begin.` : online ? "Connect a provider above, then check again." : "Pair your Mac to check your AI connections."}</div>
          <div className="ws-setup-next-row"><button className="ws-setup-text-button" onClick={onRecheck} disabled={!online || checking}>Check again</button><button className="ws-setup-primary" onClick={() => { if (ready) setStage("ready"); }} disabled={!ready}>Continue<SetupIcon name="arrow" size={17} /></button></div><p className="ws-setup-check-footnote">Checks verify CLI sign-in or API model access. They don’t send a chat or test usage limits.</p>
        </> : <>
          <div className={`ws-setup-ready-mark${ready ? " is-ready" : ""}`}><SetupIcon name={ready ? "check" : "link"} size={29} /></div><p className="ws-setup-eyebrow">YOUR WORKSPACE</p><h1 id="ws-setup-title" tabIndex={-1}>{ready ? "Ready for your first idea." : "Let’s reconnect your AI."}</h1><p className="ws-setup-description">{ready ? "Your connection is ready. Start with one perspective, or bring both into a Rivune conversation." : "The connection changed. Check your Mac before starting a conversation."}</p>
          <div className="ws-setup-ready-summary"><div><SetupIcon name="shield" size={18} /><span><strong>{access.account ? "Rivune account" : "Local development"}</strong><small>{access.account?.email || access.account?.name || "This Mac workspace · no cloud account"}</small></span></div><div><SetupIcon name="terminal" size={18} /><span><strong>{online ? snapshot?.device.name || "Your Mac" : "Mac disconnected"}</strong><small>{ready ? "Local execution connected" : "Connection needs attention"}</small></span></div>{ready && readyProviders.map(provider => <div key={provider.id}><ProviderMark mode={provider.provider === "claude" ? "claude" : "codex"} /><span><strong>{provider.provider === "codex" ? "ChatGPT" : "Claude"}</strong><small>{provider.transport === "api" ? "API access checked" : "CLI sign-in checked"}</small></span><SetupIcon name="check" size={15} /></div>)}</div>
          <button className="ws-setup-primary ws-setup-enter" onClick={enter} disabled={!ready || access.busy}>Enter workspace<SetupIcon name="arrow" size={18} /></button><button className="ws-setup-text-button ws-setup-back" onClick={() => setStage("connections")}><SetupIcon name="back" size={15} />Review connections</button><p className="ws-setup-check-footnote">You choose when to share a request with both providers.</p>
        </>}
      </section>
    </div>
  </dialog>;
}
