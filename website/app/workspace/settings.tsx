"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { effectiveModelSelection, workspaceProviderCatalog, type CatalogProvider, type ModelProvider, type ModelSelections, type NativeSettingsSection, type ProviderModelControl, type ProviderTransport, type WorkspaceSnapshot } from "./client-contract";
import type { AccountAccess } from "./setup";
import { defaultPreferences, type WorkspacePreferences } from "./preferences-contract";
import ProviderMark from "./provider-mark";
import Icon, { type IconName } from "./workspace-icon";
import ConnectionManager from "./connection-manager";
import type { ConnectionSettingsRequest } from "./connections-contract";
import "./settings.css";

export type SettingsSection = "account" | "general" | "connections" | "models" | "appearance" | "privacy" | "devices" | "about";
const sections: { id: SettingsSection; title: string; icon: IconName; description: string; keywords: string }[] = [
  { id: "account", title: "Account", icon: "user", description: "Your Rivune identity and sign-in.", keywords: "email google apple sign out login setup profile" },
  { id: "general", title: "General", icon: "sliders", description: "Make the everyday interactions yours.", keywords: "send enter command ctrl keyboard message startup replay introduction setup" },
  { id: "connections", title: "AI Connections", icon: "link", description: "Your providers, with a clear view of how each one connects.", keywords: "chatgpt openai codex claude anthropic api key cli terminal provider adapter transport" },
  { id: "models", title: "Models & reasoning", icon: "code", description: "Choose how your next request thinks.", keywords: "effort model default intelligence automatic high medium low" },
  { id: "appearance", title: "Appearance", icon: "appearance", description: "A space that feels right to work in.", keywords: "stars galaxy motion animation accessibility size text theme background" },
  { id: "privacy", title: "Data & privacy", icon: "shield", description: "Understand where your data goes and what you share.", keywords: "history draft storage sharing consent key credential secure local cloud sync" },
  { id: "devices", title: "Devices", icon: "monitor", description: "Manage this browser’s connection to your Mac.", keywords: "pair code browser mac local disconnect revoke access" },
  { id: "about", title: "About & shortcuts", icon: "info", description: "The essentials for getting around Rivune.", keywords: "version keyboard help command ctrl escape shortcuts" },
];
export const settingsTitle = (id: SettingsSection) => sections.find(item => item.id === id)?.title ?? "Settings";
const providerTitle = (provider: CatalogProvider) => provider.workspaceProvider === "codex" ? "ChatGPT" : provider.workspaceProvider === "claude" ? "Claude" : provider.title;

function SettingsGroup({ title, children, caption }: { title: string; children: ReactNode; caption?: string }) {
  return <section className="rv-settings-group"><h3>{title}</h3><div className="rv-settings-card">{children}</div>{caption && <p className="rv-settings-caption">{caption}</p>}</section>;
}
function SettingRow({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return <div className="rv-setting-row"><div><strong>{title}</strong>{description && <p>{description}</p>}</div>{children && <div className="rv-setting-control">{children}</div>}</div>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return <button type="button" role="switch" className="rv-settings-toggle" aria-label={label} aria-checked={value} onClick={() => onChange(!value)}><span /></button>;
}
function Choices<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { id:T; label:string }[]; onChange: (next:T)=>void }) {
  return <div className="rv-settings-choices" role="group" aria-label={label}>{choices.map(choice => <button key={choice.id} aria-pressed={value === choice.id} onClick={() => onChange(choice.id)}>{choice.label}</button>)}</div>;
}
function CatalogMark({ provider }: { provider: CatalogProvider }) {
  return provider.workspaceProvider ? <ProviderMark mode={provider.workspaceProvider} /> : <span className="rv-catalog-mark" aria-hidden="true">{provider.title.slice(0,1).toUpperCase()}</span>;
}
function routeStatus(route: ProviderTransport, online: boolean, checking: boolean) {
  if (!route.supported) return "Not supported yet";
  if (!online) return "Not checked";
  if (checking || route.state === "checking") return "Checking";
  if (route.state === "ready") return route.kind === "api" ? "Access checked" : "Signed in";
  if (route.state === "notChecked") return "Not checked";
  if (route.state === "notInstalled") return "Not installed";
  return "Needs setup";
}

function ProviderCard({ provider, control, selection, online, checking, nativeEnabled, nativeBusy, onNative, onModels }: {
  provider: CatalogProvider; control?: ProviderModelControl; selection?: ModelSelections[ModelProvider]; online: boolean;
  checking: boolean; nativeEnabled: boolean; nativeBusy: boolean; onNative:()=>void; onModels:(provider: ModelProvider,anchor:HTMLElement)=>void;
}) {
  const active = provider.transports.find(route => route.id === provider.activeTransportId && route.active);
  const isReady = online && !checking && active?.state === "ready";
  const activeControl = control?.transport === active?.kind ? control : undefined;
  const selected = activeControl ? effectiveModelSelection(activeControl, selection) : null;
  const activeModel = activeControl?.models.find(model => model.id === selected?.model)?.label;
  return <article className="rv-ai-provider">
    <header><CatalogMark provider={provider} /><div><h3>{providerTitle(provider)}</h3><p>{provider.title !== providerTitle(provider) ? provider.title : provider.workspaceProvider === "codex" ? "OpenAI" : provider.workspaceProvider === "claude" ? "Anthropic" : "Provider adapter"}</p></div><span className={`rv-provider-health${isReady ? " is-ready" : ""}`}><i />{!online ? "Offline" : checking ? "Checking" : isReady ? "Ready" : "Needs setup"}</span></header>
    <div className="rv-provider-transports">{provider.transports.map(route => <div className={`rv-provider-transport${route.active ? " is-active" : ""}`} key={route.id}><span className="rv-transport-icon"><Icon name={route.kind === "cli" ? "terminal" : "key"} size={17} /></span><div><strong>{route.title}</strong><p>{!route.supported ? "No runtime adapter in this Mac build" : route.kind === "cli" ? "Uses your CLI sign-in on this Mac" : "Uses the API key saved on this Mac"}</p></div><span className={online && !checking && route.state === "ready" && route.supported ? "is-ready" : ""}>{route.active && online && !checking && route.state === "ready" ? <><Icon name="check" size={12} />Active</> : routeStatus(route, online, checking)}</span></div>)}</div>
    <div className="rv-provider-current"><span>ACTIVE ROUTE</span><strong>{!online ? "Connect your Mac to check" : checking ? "Checking available routes…" : active ? `${active.kind.toUpperCase()}${activeModel ? ` · ${activeModel}` : ""}` : "No usable route"}</strong></div>
    <details className="rv-provider-detail"><summary>Connection details <Icon name="chevron" size={12} /></summary><div>{provider.transports.map(route => <p key={route.id}><strong>{route.title}</strong><span>{!online ? "Reconnect to get the latest status." : checking ? "Checking this connection…" : route.message || routeStatus(route, online, checking)}</span></p>)}</div></details>
    <footer><button className="rv-settings-button" disabled={!nativeEnabled || nativeBusy} onClick={onNative}>Open connection settings <Icon name="external" size={13} /></button>{provider.workspaceProvider && control && <button className="rv-settings-text-button" onClick={event => onModels(provider.workspaceProvider!, event.currentTarget)}>Models <Icon name="chevron" size={12} /></button>}</footer>
  </article>;
}

export default function WorkspaceSettings({ section, onSection, onClose, accountAccess, snapshot, online, paired, checking, modelSelections,
  modelControlsLocked, preferences, onPreferences, preferencesTemporary, onPair, onDisconnect, onCheck, onSetup, onReplay,
  onModels, onNativeSettings, nativeBusy, nativeNotice, connectionRequest,
}: {
  connectionRequest?: ConnectionSettingsRequest;
  section: SettingsSection; onSection:(section:SettingsSection)=>void; onClose:()=>void; accountAccess?:AccountAccess;
  snapshot:WorkspaceSnapshot|null; online:boolean; paired:boolean; checking:boolean; modelSelections:ModelSelections; modelControlsLocked:boolean;
  preferences:WorkspacePreferences; onPreferences:(patch:Partial<WorkspacePreferences>)=>void; preferencesTemporary:boolean;
  onPair:()=>void; onDisconnect:()=>void; onCheck:()=>void; onSetup:()=>void; onReplay:()=>void;
  onModels:(provider:ModelProvider,anchor?:HTMLElement)=>void; onNativeSettings:(section:NativeSettingsSection)=>void; nativeBusy:boolean; nativeNotice:string;
}) {
  const [search, setSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLHeadingElement>(null);
  const current = sections.find(item => item.id === section)!;
  const catalog = workspaceProviderCatalog(snapshot);
  const runnable = catalog.filter(provider => provider.workspaceProvider && provider.transports.some(route => route.supported));
  const discovery = catalog.filter(provider => !runnable.includes(provider));
  const nativeEnabled = online && snapshot?.capabilities?.settingsNavigation === true;
  const effectiveChecking = checking || snapshot?.startup?.phase === "checking";
  const account = accountAccess?.account;
  const accountBusy = !!(accountAccess?.busy || accountAccess?.loading);
  const matchingSections = sections.filter(item => `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(search.trim().toLowerCase()));
  const navigate = (next:SettingsSection) => { setSearch(""); onSection(next); };
  useEffect(() => { headerRef.current?.focus({preventScroll:true}); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [section]);
  const nativeHint = !online ? "Pair your Mac to open its connection settings from here." : !nativeEnabled ? "Open Rivune on your Mac to manage providers. Update the Mac app to open its settings from this browser." : "Saved API keys stay in the Mac’s Keychain. Native settings include CLI sign-in and key removal.";

  const contents: Record<SettingsSection, ReactNode> = {
    account: <>
      <section className="rv-account-card"><span className="rv-account-avatar">{account ? (account.name || account.email || "R").slice(0,1).toUpperCase() : <ProviderMark mode="rivune" />}</span><div><h3>{account?.name || account?.email || "Your Rivune account"}</h3><p>{account ? account.name && account.email ? account.email : "Signed in to Rivune" : accountAccess?.loading ? "Checking your account…" : "You’re using this workspace without a verified account."}</p><span className={`rv-account-state${account ? " is-ready" : ""}`}><i />{account ? "Signed in" : "Not signed in"}</span></div></section>
      <SettingsGroup title="Sign-in"><SettingRow title={account ? "Manage your account" : accountAccess?.signOutPending ? "Local sign-out needs attention" : "Create your account"} description={account ? "Return to setup to review your identity and connected AI." : accountAccess?.signOutPending ? "The account is hidden while Rivune retries removal of this tab’s saved session." : "Use email, Google, or Apple when account sign-in is configured."}><button className="rv-settings-button" onClick={onSetup} disabled={accountBusy}>Open account setup <Icon name="chevron" size={13} /></button></SettingRow>{(account || accountAccess?.signOutPending) && accountAccess?.onSignOut && <SettingRow title={accountAccess.signOutPending ? "Finish local sign-out" : "Sign out of Rivune"} description={accountAccess.signOutPending ? "Retry saved-session removal in this tab. This does not revoke your Rivune account or an AI-provider account." : "Your account session ends. Mac history is kept, and your current draft stays in this tab."}><button className="rv-settings-button" disabled={accountBusy} onClick={accountAccess.onSignOut}>{accountBusy ? "Signing out…" : accountAccess.signOutPending ? "Retry local sign-out" : "Sign out"}</button></SettingRow>}</SettingsGroup>
      {!accountAccess?.methods?.length && !accountAccess?.loading && <p className="rv-settings-note"><Icon name="info" size={17} /><span>Account sign-in isn’t configured yet. No cloud account has been created.</span></p>}
      {accountAccess?.error && <p className="rv-settings-feedback" role="alert">{accountAccess.error}</p>}
      <SettingsGroup title="Workspace"><SettingRow title="Your account and your providers are separate" description="A Rivune account identifies you. Your CLI sign-ins and API keys determine which AI providers can answer. Cross-device synchronization is not connected." /></SettingsGroup>
    </>,
    general: <>
      <SettingsGroup title="Writing messages" caption="This preference is saved only in this browser. Shift + Enter always inserts a new line."><SettingRow title="Send a message" description="Choose the keyboard shortcut that fits how you write."><Choices label="Send message shortcut" value={preferences.sendShortcut} choices={[{id:"enter",label:"Enter"},{id:"mod-enter",label:"⌘ / Ctrl + Enter"}]} onChange={sendShortcut => onPreferences({sendShortcut})} /></SettingRow></SettingsGroup>
      <SettingsGroup title="Startup & setup"><SettingRow title="Arrival" description="Replay the Rivune introduction. Your conversation and draft stay here."><button className="rv-settings-button" onClick={onReplay}><Icon name="replay" size={14} />Replay arrival</button></SettingRow><SettingRow title="Account and AI setup" description="Review account sign-in, connect your Mac, and check your providers."><button className="rv-settings-button" onClick={onSetup}>Open setup <Icon name="chevron" size={13} /></button></SettingRow></SettingsGroup>
      <SettingsGroup title="Request behavior"><SettingRow title="Connection recovery" description="If a connection drops, Rivune checks whether your request arrived and keeps your draft until it is confirmed. It never sends that request again automatically." /></SettingsGroup>
    </>,
    connections: <>
      <div className="rv-device-banner"><span><Icon name="monitor" size={23} /></span><div><strong>{online ? snapshot?.device.name || "Connected Mac" : "Connect this workspace to your Mac"}</strong><p>{online ? "CLI sign-ins and API keys run through your local connection." : "Pair Rivune on this Mac to see your providers and their current status."}</p></div><button className="rv-settings-button" onClick={onPair}>{online ? "Manage pairing" : "Pair your Mac"}<Icon name="chevron" size={13} /></button></div>
      <ConnectionManager request={connectionRequest} snapshot={snapshot} online={online} onPair={onPair} onNative={nativeEnabled ? () => onNativeSettings("connections") : undefined} locked={modelControlsLocked || effectiveChecking} />
      <details className="rv-provider-catalog"><summary>Active routes & connection details <Icon name="chevron" size={13} /></summary>
      {runnable.length ? <><div className="rv-provider-grid">{runnable.map(provider => <ProviderCard key={provider.id} provider={provider} control={snapshot?.modelControls?.find(item => item.provider === provider.workspaceProvider)} selection={provider.workspaceProvider ? modelSelections[provider.workspaceProvider] : undefined} online={online} checking={effectiveChecking} nativeEnabled={nativeEnabled} nativeBusy={nativeBusy} onNative={() => onNativeSettings("connections")} onModels={onModels} />)}</div><p className="rv-settings-note"><Icon name="activity" size={17} /><span><strong>Automatic routing.</strong> Rivune uses a ready CLI connection first, then a ready API connection. The active route determines the available models and reasoning controls.</span></p></> : <div className="rv-settings-empty"><Icon name="link" size={26} /><h3>Your providers will appear here.</h3><p>The connected Mac supplies its provider catalog. Pair your Mac to see available CLI and API adapters and configure your providers securely.</p></div>}
      <SettingsGroup title="Connection checks"><SettingRow title={effectiveChecking ? "Checking your providers…" : "Check CLI sign-ins and API access"} description="Checks verify CLI authentication or API model access. They do not send a chat or confirm remaining usage limits."><button className="rv-settings-button" onClick={onCheck} disabled={!online || effectiveChecking}><Icon name="replay" size={14} />{effectiveChecking ? "Checking…" : "Check again"}</button></SettingRow></SettingsGroup>
      {discovery.length > 0 && <details className="rv-provider-catalog"><summary>Provider catalog <span>{discovery.length} additional {discovery.length === 1 ? "provider" : "providers"}</span><Icon name="chevron" size={14} /></summary><div><label className="rv-settings-search"><Icon name="search" size={16} /><input type="search" aria-label="Search provider catalog" placeholder="Find a provider" value={providerSearch} onChange={event => setProviderSearch(event.target.value)} /></label>{discovery.filter(provider => `${provider.title} ${provider.transports.map(route => route.title).join(" ")}`.toLowerCase().includes(providerSearch.trim().toLowerCase())).map(provider => <div className="rv-catalog-provider" key={provider.id}><CatalogMark provider={provider} /><div><strong>{provider.title}</strong><p>{provider.transports.map(route => route.title).join(" · ") || "No runtime adapter installed"}</p></div><span>Not supported yet</span></div>)}<p className="rv-settings-caption">Catalog entries describe adapters. Only supported workspace providers can run conversations.</p></div></details>}
      </details>
      <p className="rv-settings-caption">{nativeHint}</p>
    </>,
    models: <>
      <p className="rv-settings-note"><Icon name="code" size={17} /><span>Choose a model and reasoning effort for your next request. Browser choices stay in this workspace and do not change your Mac defaults.</span></p>
      {snapshot?.modelControls?.length ? <div className="rv-model-settings-list">{snapshot.modelControls.map(control => {
        const provider = catalog.find(item => item.workspaceProvider === control.provider);
        const selection = effectiveModelSelection(control, modelSelections[control.provider]);
        const modelLabel = control.models.find(item => item.id === selection.model)?.label || "No model configured";
        const reasoningLabel = control.reasoning.find(item => item.id === selection.reasoning)?.label || "Not available";
        return <section className="rv-model-settings-card" key={control.provider}><header><ProviderMark mode={control.provider} /><div><h3>{provider ? providerTitle(provider) : control.provider === "codex" ? "ChatGPT" : "Claude"}</h3><p>{online ? control.transport === "api" ? "API connection · configured on Mac" : "CLI connection · request preferences" : "Last received options · reconnect to update"}</p></div><span>{control.transport.toUpperCase()}</span></header><dl><div><dt>Model</dt><dd>{modelLabel}</dd></div><div><dt>Reasoning</dt><dd>{reasoningLabel}</dd></div></dl><footer><p>{modelControlsLocked ? "Choices are locked while a request is pending or running." : control.editable ? modelSelections[control.provider] ? "Using your workspace selection." : "Using your Mac defaults." : control.note || "This API model is configured on your Mac. Reasoning is provider managed."}</p><button className="rv-settings-button" onClick={event => onModels(control.provider,event.currentTarget)}>{control.editable ? "Choose model" : "View model"}<Icon name="chevron" size={13} /></button>{!control.editable && nativeEnabled && <button className="rv-settings-text-button" onClick={() => onNativeSettings("models")} disabled={nativeBusy}>Edit on Mac <Icon name="external" size={12} /></button>}</footer></section>;
      })}</div> : <div className="rv-settings-empty"><Icon name="code" size={27} /><h3>Models come from your active connection.</h3><p>{online ? "This Mac hasn’t reported model controls. Update Rivune on your Mac to choose them here; existing Mac defaults still apply." : "Pair your Mac to load the models and reasoning options supported by its CLI or API connections."}</p><button className="rv-settings-button" onClick={onPair}>{online ? "Manage pairing" : "Pair your Mac"}</button></div>}
      <SettingsGroup title="CLI and API behavior"><SettingRow title="The active transport controls these options" description="CLI connections expose the model and reasoning choices supplied by the Mac runtime. API connections show the saved API model and provider-managed reasoning. A route change clears incompatible workspace choices before the next request." /></SettingsGroup>
    </>,
    appearance: <>
      <div className={`rv-appearance-preview${preferences.galaxy ? " has-galaxy" : ""}${preferences.stars ? " has-stars" : ""}`} aria-hidden="true"><div><ProviderMark mode="rivune" /><span>Rivune</span></div><span className="rv-appearance-sample">A little room to think.</span><span className="rv-appearance-bubble">Your workspace, your atmosphere.</span></div>
      <label className="rv-settings-row">Background brightness<input aria-label="Background brightness" type="range" min="0.15" max="0.85" step="0.01" value={1-preferences.backgroundDim} onChange={event=>onPreferences({backgroundDim:1-Number(event.target.value)})} /></label>
      <SettingsGroup title="Atmosphere" caption="Changes apply immediately to this browser’s workspace."><SettingRow title="Stars" description="Fine points of light around your workspace."><Toggle label="Show stars" value={preferences.stars} onChange={stars=>onPreferences({stars})} /></SettingRow><SettingRow title="Galaxy backdrop" description="A quiet blue glow behind the glass surfaces."><Toggle label="Show galaxy backdrop" value={preferences.galaxy} onChange={galaxy=>onPreferences({galaxy})} /></SettingRow></SettingsGroup>
      <SettingsGroup title="Reading & motion"><SettingRow title="Text size" description="Increase conversation text, controls, and supporting labels."><Choices label="Text size" value={preferences.textSize} choices={[{id:"standard",label:"Standard"},{id:"large",label:"Larger"}]} onChange={textSize=>onPreferences({textSize})} /></SettingRow><SettingRow title="Motion" description="System follows your device’s reduced-motion setting. Reduced removes transitions and startup animation."><Choices label="Motion preference" value={preferences.motion} choices={[{id:"system",label:"System"},{id:"reduced",label:"Reduced"}]} onChange={motion=>onPreferences({motion})} /></SettingRow></SettingsGroup>
      <div className="rv-settings-bottom-action"><p>These visual preferences stay in this browser.</p><button className="rv-settings-text-button" onClick={()=>onPreferences({backgroundDim:defaultPreferences.backgroundDim,stars:defaultPreferences.stars,galaxy:defaultPreferences.galaxy,motion:defaultPreferences.motion,textSize:defaultPreferences.textSize})}>Reset appearance</button></div>
    </>,
    privacy: <>
      <SettingsGroup title="Conversations & drafts"><SettingRow title="History lives on your Mac" description="The browser displays recent conversations from Rivune on your Mac. Full history remains in the Mac app; cross-device cloud synchronization is not connected." /><SettingRow title="Drafts stay in this tab" description="Opening Settings or replaying arrival keeps your current draft. Drafts are not saved to browser storage and are cleared if you reload or close the tab." /></SettingsGroup>
      <SettingsGroup title="What providers receive"><SettingRow title="Direct conversations" description="Only the selected provider receives your request and the context supplied by the Mac runtime." /><SettingRow title="Rivune collaboration" description="ChatGPT and Claude receive your request and recent context only after you check the sharing consent in the composer. That checkbox is required for each submitted team request." /></SettingsGroup>
      <SettingsGroup title="Credentials & local storage"><SettingRow title="Provider credentials are stored on your Mac" description="CLI sign-ins stay in their local tools. API keys entered in AI Connections go directly to your paired Mac’s Keychain and are cleared from the form. Saved keys are never sent back to the browser." /><SettingRow title="Browser pairing is temporary" description="The pairing code is kept only in this tab’s memory. Disconnecting or reloading clears it here. Stop browser access on your Mac to revoke its connection." /><SettingRow title="Only visual and keyboard preferences are saved" description="Stars, the backdrop, text size, motion, and the send shortcut are stored in this browser. A configured Rivune account session uses separate tab-scoped session storage." /></SettingsGroup>
    </>,
    devices: <>
      <section className="rv-device-card"><span className="rv-device-illustration"><Icon name="monitor" size={52} /></span><div><span className={`rv-provider-health${online ? " is-ready" : ""}`}><i />{online ? "Connected" : paired ? "Reconnecting" : "Not paired"}</span><h3>{snapshot?.device.name || "Your Mac"}</h3><p>{online ? "This browser is paired with Rivune on the same Mac." : "Pair this browser with the Mac running Rivune to use its provider connections and history."}</p></div></section>
      <SettingsGroup title="This browser"><SettingRow title="Mac pairing" description="Keep the Mac app open and browser access enabled. Your pairing code is never included in page URLs or saved to browser storage."><button className="rv-settings-button" onClick={onPair}>{paired ? "Manage pairing" : "Pair your Mac"}</button></SettingRow>{paired && <SettingRow title="Disconnect this tab" description="Clear the local pairing code. Work already submitted can continue on your Mac; this action does not cancel it."><button className="rv-settings-button" onClick={onDisconnect}>Disconnect</button></SettingRow>}<SettingRow title="Manage browser access on Mac" description="Open native settings to enable, stop, or recreate browser access."><button className="rv-settings-button" disabled={!nativeEnabled || nativeBusy} onClick={()=>onNativeSettings("devices")}>Open Mac settings <Icon name="external" size={13} /></button></SettingRow></SettingsGroup>
      <p className="rv-settings-caption">Mac pairing is separate from your Rivune account sign-in. This screen lists only the Mac connected to this tab.</p>
    </>,
    about: <>
      <section className="rv-about-brand"><ProviderMark mode="rivune" /><div><h3>Rivune</h3><p>Multiple perspectives. One place to think.</p><span>Browser workspace · local Mac execution</span></div></section>
      <SettingsGroup title="Keyboard shortcuts"><SettingRow title="Send a message"><kbd>{preferences.sendShortcut === "enter" ? "Enter" : "⌘ / Ctrl + Enter"}</kbd></SettingRow><SettingRow title="New line"><kbd>{preferences.sendShortcut === "enter" ? "Shift + Enter" : "Enter"}</kbd></SettingRow><SettingRow title="Close an open dialog"><kbd>Esc</kbd></SettingRow><SettingRow title="Move through controls"><kbd>Tab</kbd></SettingRow></SettingsGroup>
      <SettingsGroup title="Available in this workspace"><SettingRow title="ChatGPT, Claude, and Rivune collaboration" description="Text conversations run through the active CLI or API adapters on your Mac. Model access and usage limits depend on the connected provider account." /><SettingRow title="A clear view of every request" description="Review the Mac’s request progress and recorded activity from your conversation. Reconnect to see the latest status without starting a duplicate task." /></SettingsGroup>
      <p className="rv-settings-caption">Attachments, tool execution, and cross-device synchronization are not enabled in this browser workspace.</p>
    </>,
  };

  return <div className="rv-settings-shell">
    <aside className="rv-settings-nav"><button className="rv-settings-back" onClick={onClose}><Icon name="chevron" size={13} /><span>Back to workspace</span></button><label className="rv-settings-search"><Icon name="search" size={15} /><input type="search" aria-label="Search settings" placeholder="Search settings" value={search} onChange={event=>setSearch(event.target.value)} /></label><nav aria-label="Settings sections">{sections.map(item=><button key={item.id} className={section===item.id && !search ? "is-active" : ""} aria-current={section===item.id && !search ? "page" : undefined} onClick={()=>navigate(item.id)}><Icon name={item.icon} size={16} /><span>{item.title}</span></button>)}</nav><div className="rv-settings-local"><span className={online ? "is-ready" : ""} /><span>{online ? "Mac connected" : "Local workspace"}</span></div></aside>
    <div className="rv-settings-scroll" ref={scrollRef}><div className="rv-settings-content"><header><p>SETTINGS</p><h2 ref={headerRef} tabIndex={-1}>{search.trim() ? "Search settings" : current.title}</h2><span>{search.trim() ? `Results for “${search.trim()}”` : current.description}</span></header>
      {nativeNotice && <p className="rv-settings-feedback" role="status">{nativeNotice}</p>}
      {preferencesTemporary && <p className="rv-settings-feedback" role="status">Browser storage isn’t available. These preferences will last for this page only.</p>}
      {search.trim() ? <div className="rv-settings-results">{matchingSections.length ? matchingSections.map(item=><button key={item.id} onClick={()=>navigate(item.id)}><Icon name={item.icon} size={20} /><span><strong>{item.title}</strong><small>{item.description}</small></span><Icon name="chevron" size={15} /></button>) : <div className="rv-settings-empty"><Icon name="search" size={25} /><h3>No matching settings</h3><p>Try “model”, “API”, “text”, or “account”.</p><button className="rv-settings-button" onClick={()=>setSearch("")}>Clear search</button></div>}</div> : contents[section]}
    </div></div>
  </div>;
}
