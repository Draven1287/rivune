"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type CSSProperties } from "react";
import {
  loadWorkspace, modeIsReady, preferredReadyMode, parseConnectionCode, promptFits, workspaceRequest, WorkspaceAPIError, startupState,
  chooseModel, effectiveModelSelection, modelSelectionIsValid, requestModelSelections, modelControlChanged,
  type ModelProvider, type ModelSelection, type ModelSelections, type ProviderModelControl,
  type NativeSettingsSection, type ConnectionCode, type RunMode, type RunSubmission, type WorkspaceConversation, type WorkspaceRun, type WorkspaceSnapshot,
} from "./client-contract";
import { parseConnectionSettings, type ConnectionSettingsRequest } from "./connections-contract";
import WorkspaceStartup, { SpaceField } from "./startup";
import WorkspaceSetup, { type AccountAccess } from "./setup";
import ProviderMark from "./provider-mark";
import Icon from "./workspace-icon";
import WorkspaceSettings, { settingsTitle, type SettingsSection } from "./settings";
import { useWorkspacePreferences } from "./preferences-client";
import { shouldSubmitMessage } from "./preferences-contract";
import "./workspace.css";
import "./reference-shell.css";
import "./space-shell.css";
import "./workbench.css";
import "./cosmos.css";



const modeTitles: Record<RunMode, string> = { rivune: "Rivune", codex: "ChatGPT", claude: "Claude" };
const statusTitles: Record<WorkspaceRun["status"], string> = {
  running: "Working", complete: "Complete", failed: "Needs attention", cancelled: "Stopped", interrupted: "Interrupted",
};
const suggestions = [
  { icon: "idea" as const, label: "Think", detail: "Explore an idea or work through a decision.", prompt: "Help me think through a decision. Start by asking what I am deciding and what matters most." },
  { icon: "code" as const, label: "Build", detail: "Turn a starting point into a practical plan.", prompt: "Help me build something. Ask what I want to make, who it is for, and what I have already, then help me find a practical first step." },
  { icon: "activity" as const, label: "Review", detail: "Get another perspective on your work.", prompt: "Help me review my work. Ask me to share the idea, writing, or code, then identify what is strong and what could be clearer." },
];

function friendlyStage(stage: string) {
  const titles: Record<string, string> = { idle: "Ready", asking: "Preparing a response", comparing: "Reviewing the contributions", synthesizing: "Resolving the answer", complete: "Complete", planning: "Preparing the shared brief", contributing: "Working through the brief", reviewing: "Reviewing the contributions", integrating: "Resolving the answer" };
  return titles[stage] ?? stage.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2,-2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1,-1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return part;
  });
}

function CodeBlock({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return <div className="ws-code-block">
    <div><span>{language || "Code"}</span><button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(content); setCopied(true); setCopyError(false); }
      catch { setCopyError(true); }
    }}><Icon name={copied ? "check" : "copy"} size={13} /> {copyError ? "Select to copy" : copied ? "Copied" : "Copy"}</button></div>
    <pre><code>{content}</code></pre>
  </div>;
}

function ResultBody({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const appendText = (value: string, key: string) => {
    value.trim().split(/\n\s*\n/).filter(Boolean).forEach((paragraph, index) => {
      const lines = paragraph.split("\n");
      if (lines.every(line => /^\s*[-*] /.test(line))) {
        blocks.push(<ul key={`${key}-${index}`}>{lines.map((line, i) => <li key={i}><InlineText text={line.replace(/^\s*[-*] /, "")} /></li>)}</ul>);
      } else if (lines.every(line => /^\s*\d+\. /.test(line))) {
        blocks.push(<ol key={`${key}-${index}`}>{lines.map((line, i) => <li key={i}><InlineText text={line.replace(/^\s*\d+\. /, "")} /></li>)}</ol>);
      } else {
        lines.forEach((line, i) => {
          const heading = line.match(/^#{1,6}\s+(.+)/);
          blocks.push(heading ? <h3 key={`${key}-${index}-${i}`}><InlineText text={heading[1]} /></h3>
            : <p key={`${key}-${index}-${i}`}><InlineText text={line} /></p>);
        });
      }
    });
  };
  const code = /```([^\n]*)\n([\s\S]*?)(?:```|$)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = code.exec(content)) !== null) {
    appendText(content.slice(cursor, match.index), `text-${cursor}`);
    blocks.push(<CodeBlock key={`code-${match.index}`} language={match[1].trim()} content={match[2].replace(/\n$/, "")} />);
    cursor = code.lastIndex;
  }
  appendText(content.slice(cursor), `text-${cursor}`);
  return <div className="ws-result-body">{blocks}</div>;
}

function WorkCards({ items, latestRuns, online, onSelect }: {
  items: WorkspaceConversation[];
  latestRuns: Map<string, WorkspaceRun>;
  online: boolean;
  onSelect: (id: string) => void;
}) {
  return <div className="ws-work-grid">{items.map(item => {
    const latest = latestRuns.get(item.id);
    return <button className="ws-work-card" key={item.id} onClick={() => onSelect(item.id)}>
      <span className="ws-work-card-top"><ProviderMark mode={item.mode} /><span>{latest ? <span className={`ws-run-status ws-run-status--${latest.status}`}>{!online && latest.status === "running" ? "Last seen working" : statusTitles[latest.status]}</span> : modeTitles[item.mode]}</span><Icon name="chevron" size={14} /></span>
      <strong>{item.title || "Untitled conversation"}</strong>
      <span className="ws-work-preview">{latest?.prompt || "Open this conversation to pick up where you left off."}</span>
      <span className="ws-work-card-bottom"><span>{modeTitles[item.mode]}</span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></span>
    </button>;
  })}</div>;
}

type WorkspaceSurface = "home" | "conversations" | "conversation";

type PendingSubmission = RunSubmission & { draftKey: string; originalDraft: string; state: "submitting" | "confirming" | "uncertain" };

export default function WorkspaceClient({ accountAccess }: { accountAccess?: AccountAccess } = {}) {
  const { preferences, updatePreferences, storageFailed } = useWorkspacePreferences();
  const [showStartup, setShowStartup] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [checkingReadiness, setCheckingReadiness] = useState(false);
  const [showAllSidebarChats, setShowAllSidebarChats] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [connection, setConnection] = useState<ConnectionCode | null>(null);
  const activeConnectionRef = useRef<ConnectionCode | null>(null);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [online, setOnline] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [surface, setSurface] = useState<WorkspaceSurface>("home");
  const surfaceRef = useRef<WorkspaceSurface>("home");
  const [search, setSearch] = useState("");
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<RunMode>("rivune");
  const [modelSelections, setModelSelections] = useState<ModelSelections>({});
  const modelSelectionsRef = useRef<ModelSelections>({});
  const modelControlsRef = useRef<ProviderModelControl[]>([]);
  const [modelProvider, setModelProvider] = useState<ModelProvider | null>(null);
  const [modelPanelPosition, setModelPanelPosition] = useState({ left: 250, top: 90 });
  const [modelHint, setModelHint] = useState("");
  const modelDialogRef = useRef<HTMLDialogElement>(null);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [notice, setNotice] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const settingsSectionRef = useRef<SettingsSection>("general");
  const [nativeSettingsBusy, setNativeSettingsBusy] = useState(false);
  const nativeSettingsBusyRef = useRef(false);
  const [nativeSettingsNotice, setNativeSettingsNotice] = useState("");
  const [activityRunID, setActivityRunID] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [pending, setPending] = useState<PendingSubmission | null>(null);
  const pendingRef = useRef<PendingSubmission | null>(null);
  const [cancellingID, setCancellingID] = useState<string | null>(null);
  const [openingNative, setOpeningNative] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectionInput, setConnectionInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const connectionGeneration = useRef(0);
  const lastRevisionRef = useRef(-1);

  const selectConversation = (id: string | null) => {
    if (selectedRef.current !== id) setShareWithTeam(false);
    const nextSurface = id ? "conversation" : "home";
    surfaceRef.current = nextSurface;
    setSurface(nextSurface);
    setShowSettings(false);
    selectedRef.current = id;
    setSelectedID(id);
    setShowSidebar(false);
    setActivityRunID(null);
    setNotice("");
    const conversation = snapshot?.conversations.find(item => item.id === id);
    if (conversation) setMode(conversation.mode);
  };
  const browseConversations = () => {
    setShareWithTeam(false);
    surfaceRef.current = "conversations";
    setSurface("conversations");
    setShowSettings(false);
    selectedRef.current = null;
    setSelectedID(null);
    setShowSidebar(false);
    setActivityRunID(null);
    setNotice("");
  };
  const updatePending = (value: PendingSubmission | null) => { pendingRef.current = value; setPending(value); };
  const submissionIsPending = (id: string) => pendingRef.current?.id === id;

  const applySnapshot = useCallback((next: WorkspaceSnapshot) => {
    if (next.revision < lastRevisionRef.current) return;
    lastRevisionRef.current = next.revision;
    setSnapshot(next);
    const retainedModels: ModelSelections = {};
    const changedProviders: string[] = [];
    for (const provider of ["codex", "claude"] as const) {
      const control = next.modelControls?.find(item => item.provider === provider);
      const selection = modelSelectionsRef.current[provider];
      if (control?.editable && selection && !modelControlChanged(modelControlsRef.current.find(item => item.provider === provider), control) && modelSelectionIsValid(control, selection)) retainedModels[provider] = selection;
      else if (selection) changedProviders.push(modeTitles[provider]);
    }
    modelControlsRef.current = next.modelControls ?? [];
    if (changedProviders.length) {
      modelSelectionsRef.current = retainedModels;
      setModelSelections(retainedModels);
      const message = `${changedProviders.join(" and ")} model options changed on your Mac. The next request will use the Mac defaults; review Models & reasoning to choose again.`;
      setModelHint(message);
      setNotice(message);
    }
    if (!selectedRef.current) setMode(current => preferredReadyMode(current, next.connections));
    setOnline(true);
    setConnectionError("");
    const submission = pendingRef.current;
    const acceptedRun = submission && next.runs.find(run => run.id === submission.id);
    if (submission && acceptedRun) {
      setDrafts(current => current[submission.draftKey] === submission.originalDraft ? { ...current, [submission.draftKey]: "" } : current);
      if (selectedRef.current === (submission.conversationID ?? null) && surfaceRef.current !== "conversations") {
        selectedRef.current = acceptedRun.conversationID;
        setSelectedID(acceptedRun.conversationID);
        surfaceRef.current = "conversation";
        setSurface("conversation");
      }
      pendingRef.current = null;
      setPending(null);
      setShareWithTeam(false);
    }
    setCancellingID(current => current && next.runs.some(run => run.id === current && run.status === "running") ? current : null);
  }, []);

  useEffect(() => {
    if (!connection) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const next = await loadWorkspace(connection, controller.signal);
        if (!disposed && activeConnectionRef.current === connection) applySnapshot(next);
      } catch (error) {
        if (disposed || activeConnectionRef.current !== connection) return;
        setOnline(false);
        setConnectionError(error instanceof Error && !(error instanceof TypeError) && error.name !== "AbortError" ? error.message : "The Mac connection is unavailable. Showing the last received state; reconnecting automatically.");
        if (error instanceof WorkspaceAPIError && [401, 403].includes(error.status)) {
          activeConnectionRef.current = null;
          setConnection(null);
          return;
        }
      }
      if (!disposed) timer = setTimeout(poll, 2_000);
    };
    void poll();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); };
  }, [connection, applySnapshot]);

  useEffect(() => {
    if (dialogOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialogOpen]);

  useEffect(() => {
    if (modelProvider && !modelDialogRef.current?.open) modelDialogRef.current?.showModal();
    else if (!modelProvider) modelDialogRef.current?.close();
  }, [modelProvider]);

  const runs = (snapshot?.runs ?? []).filter(run => run.conversationID === selectedID)
    .sort((a,b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const lastRun = runs.at(-1);
  const activityRun = runs.find(run => run.id === activityRunID) ?? lastRun;
  const lastRunID = lastRun?.id;
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [selectedID, lastRunID]);

  const draftKey = selectedID ?? "new";
  const draft = drafts[draftKey] ?? "";
  const setDraft = (text: string) => setDrafts(current => ({ ...current, [draftKey]: text }));
  const conversation = snapshot?.conversations.find(item => item.id === selectedID);
  const ready = !checkingReadiness && snapshot?.startup?.phase !== "checking" && modeIsReady(mode, snapshot?.connections ?? []);
  const running = runs.find(run => run.status === "running");
  const modelControlsLocked = !!pending || !!snapshot?.runs.some(run => run.status === "running");
  const accountRequired = !accountAccess?.allowLocal && !!(accountAccess?.methods?.length || accountAccess?.loading);
  const accountReady = !accountRequired || (!!accountAccess?.account && !accountAccess.loading && !accountAccess.busy);
  const canSend = !showStartup && !showSetup && accountReady && online && ready && !!draft.trim() && promptFits(draft) && !pending && !running && (mode !== "rivune" || shareWithTeam);
  const visiblePending = pending && (pending.conversationID ?? null) === selectedID;
  const conversations = [...(snapshot?.conversations ?? [])].sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const filteredConversations = conversations.filter(item => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const latestRuns = new Map<string, WorkspaceRun>();
  for (const run of snapshot?.runs ?? []) {
    const previous = latestRuns.get(run.conversationID);
    if (!previous || Date.parse(run.createdAt) > Date.parse(previous.createdAt)) latestRuns.set(run.conversationID, run);
  }
  const readyCount = new Set(snapshot?.connections.filter(item => ["codex", "claude"].includes(item.provider) && item.state === "ready").map(item => item.provider) ?? []).size;
  const checkReadiness = async (current = activeConnectionRef.current) => {
    if (!current) return;
    setCheckingReadiness(true);
    try {
      await workspaceRequest(current, "/v1/readiness", {});
      const next = await loadWorkspace(current);
      if (activeConnectionRef.current === current) applySnapshot(next);
    } catch (error) {
      if (activeConnectionRef.current === current) { setOnline(false); setConnectionError(error instanceof WorkspaceAPIError && error.status === 404 ? "Update Rivune on your Mac to run startup checks. The last reported connection state is shown." : "The connection check could not finish. Try checking again in Connections."); }
    } finally { setCheckingReadiness(false); }
  };
  const replayStartup = () => { setShowSidebar(false); setShowSetup(false); setShowStartup(true); void checkReadiness(); };
  const finishStartup = () => {
    const connected = startupState(snapshot, online, connecting || checkingReadiness).phase === "ready" && readyCount > 0;
    if (connected) setMode(current => preferredReadyMode(current, snapshot?.connections ?? []));
    setShowStartup(false);
    setShowSetup(!connected || !accountReady);
  };

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    setConnecting(true);
    setDialogError("");
    const generation = ++connectionGeneration.current;
    try {
      const candidate = parseConnectionCode(connectionInput);
      const next = await loadWorkspace(candidate);
      if (generation !== connectionGeneration.current) return;
      activeConnectionRef.current = candidate;
      lastRevisionRef.current = -1;
      modelSelectionsRef.current = {};
      setModelSelections({});
      applySnapshot(next);
      setConnection(candidate);
      setConnectionInput("");
      setDialogOpen(false);
      void checkReadiness(candidate);
    } catch (error) {
      if (generation === connectionGeneration.current) setDialogError(error instanceof WorkspaceAPIError || (error instanceof Error && !(error instanceof TypeError) && error.name !== "AbortError")
        ? error.message : "Could not reach Rivune. Keep the Mac app open with browser access enabled, then copy a fresh code.");
    } finally { if (generation === connectionGeneration.current) setConnecting(false); }
  };

  const disconnect = () => {
    connectionGeneration.current += 1;
    activeConnectionRef.current = null;
    setConnection(null);
    setOnline(false);
    setConnectionError("");
    setConnectionInput("");
    setDialogOpen(false);
    setConnecting(false);
    modelSelectionsRef.current = {};
    setModelSelections({});
  };

  const refreshAfterAction = async (current: ConnectionCode) => {
    try {
      const next = await loadWorkspace(current);
      if (activeConnectionRef.current === current) applySnapshot(next);
    } catch { /* Polling keeps reconciling using the original request ID. */ }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!connection || !canSend || pendingRef.current) return;
    const submission: PendingSubmission = {
      id: crypto.randomUUID(), ...(selectedID ? { conversationID: selectedID } : {}),
      prompt: draft.trim(), mode, shareWithTeam: mode === "rivune" && shareWithTeam,
      modelSelections: requestModelSelections(mode, snapshot?.modelControls, modelSelections),
      draftKey, originalDraft: draft, state: "submitting",
    };
    updatePending(submission);
    setNotice("");
    try {
      const { id, conversationID, prompt, mode: requestMode, shareWithTeam: sharing, modelSelections: requestModels } = submission;
      await workspaceRequest(connection, "/v1/runs", { id, conversationID, prompt, mode: requestMode, shareWithTeam: sharing, ...(requestModels ? { modelSelections: requestModels } : {}) });
      if (submissionIsPending(submission.id)) updatePending({ ...submission, state: "confirming" });
      await refreshAfterAction(connection);
    } catch (error) {
      if (!submissionIsPending(submission.id)) return;
      if (error instanceof WorkspaceAPIError && error.status >= 400 && error.status < 500 && error.status !== 408) {
        updatePending(null);
        setNotice(error.message);
      } else {
        updatePending({ ...submission, state: "uncertain" });
        await refreshAfterAction(connection);
      }
    }
  };

  const cancelRun = async (runID: string) => {
    if (!connection || !online || cancellingID) return;
    setCancellingID(runID);
    try {
      await workspaceRequest(connection, `/v1/runs/${encodeURIComponent(runID)}/cancel`, {});
      await refreshAfterAction(connection);
    } catch (error) {
      if (error instanceof WorkspaceAPIError && error.status >= 400 && error.status < 500) setCancellingID(null);
      setNotice("The stop request could not be confirmed. Checking the Mac’s run state.");
    }
  };

  const openNative = async () => {
    if (!connection || !online || !selectedID) return;
    setOpeningNative(true);
    try { await workspaceRequest(connection, "/v1/open", { conversationID: selectedID }); }
    catch { setNotice("Could not open this conversation in Rivune. Open the Mac app and select it there."); }
    finally { setOpeningNative(false); }
  };

  const openNativeSettings = async (section: NativeSettingsSection) => {
    const current = activeConnectionRef.current;
    if (!current || !online || !snapshot?.capabilities?.settingsNavigation || nativeSettingsBusyRef.current) return;
    nativeSettingsBusyRef.current = true;
    setNativeSettingsBusy(true);
    setNativeSettingsNotice("");
    try {
      const result = await workspaceRequest(current, "/v1/settings/open", { section });
      if (activeConnectionRef.current !== current || settingsSectionRef.current !== section) return;
      if (!result || typeof result !== "object" || !("opened" in result) || result.opened !== true || !("section" in result) || result.section !== section) {
        setNativeSettingsNotice("Could not confirm that Mac settings opened. Open Rivune on your Mac to continue.");
      } else setNativeSettingsNotice("Opened settings in Rivune on your Mac.");
    } catch {
      if (activeConnectionRef.current === current && settingsSectionRef.current === section) setNativeSettingsNotice("Could not open Mac settings. Keep Rivune open and update or reconnect your local connection.");
    } finally { nativeSettingsBusyRef.current = false; setNativeSettingsBusy(false); }
  };

  const connectionSettingsRequest = useCallback<ConnectionSettingsRequest>(async (path, body) => {
    const current = connection;
    if (!current || activeConnectionRef.current !== current || !online || !snapshot?.capabilities?.connectionManagement) throw new Error("Pair the updated Rivune Mac app to configure connections.");
    const result = await workspaceRequest(current, path, body);
    if (activeConnectionRef.current !== current) throw new Error("Mac pairing changed. Reconnect before editing connections.");
    return parseConnectionSettings(result);
  }, [connection, online, snapshot?.capabilities?.connectionManagement]);
  const connectionRequest = online && snapshot?.capabilities?.connectionManagement ? connectionSettingsRequest : undefined;

  const showConnection = () => { setDialogError(""); setDialogOpen(true); };
  const selectSettingsSection = (section: SettingsSection) => { settingsSectionRef.current = section; setSettingsSection(section); setNativeSettingsNotice(""); };
  const openSettings = () => { selectSettingsSection("general"); setShowSettings(true); setShowSidebar(false); };
  const openConnections = () => { selectSettingsSection("connections"); setShowSettings(true); setShowSidebar(false); };
  const openModelControls = (provider: ModelProvider, anchor?: HTMLElement) => {
    if (anchor) {
      const bounds = anchor.getBoundingClientRect();
      const besideComposer = !!anchor.closest(".ws-composer");
      setModelPanelPosition({ left: Math.max(12, Math.min(besideComposer ? bounds.right - 476 : bounds.right + 16, window.innerWidth - 492)), top: Math.max(16, Math.min(bounds.top - (besideComposer ? 542 : 90), window.innerHeight - 565)) });
    }
    setModelHint("");
    setModelProvider(provider);
  };
  const modelControlFor = (provider: ModelProvider) => snapshot?.modelControls?.find(item => item.provider === provider);
  const selectedModelFor = (provider: ModelProvider) => {
    const control = modelControlFor(provider);
    if (!control) return null;
    const selection = effectiveModelSelection(control, modelSelections[provider]);
    return { control, selection, label: control.models.find(item => item.id === selection.model)?.label || "No model configured", reasoningLabel: control.reasoning.find(item => item.id === selection.reasoning)?.label };
  };
  const modelControlMessage = (control?: ProviderModelControl) => !online ? "Connect your Mac to load models and reasoning options."
    : !control ? "Update Rivune on your Mac to choose models here. Your Mac’s defaults are used."
    : modelControlsLocked ? "Model settings are locked while a request is pending or running."
    : checkingReadiness || snapshot?.startup?.phase === "checking" ? "Checking your provider connection."
    : !modeIsReady(control.provider, snapshot?.connections ?? []) ? "Connect this provider in the Mac app to choose its model."
    : !control.editable ? control.note || "This API model is configured on your Mac. Reasoning is managed by the provider."
    : "Applies to your next request in this workspace. Your Mac defaults stay unchanged.";
  const canEditModels = (control?: ProviderModelControl) => !!control?.editable && online && !modelControlsLocked && !checkingReadiness && snapshot?.startup?.phase !== "checking" && modeIsReady(control.provider, snapshot?.connections ?? []);
  const setModelChoice = (provider: ModelProvider, selection: ModelSelection) => {
    const control = modelControlFor(provider);
    if (!canEditModels(control) || !control || !modelSelectionIsValid(control, selection)) return;
    const next = { ...modelSelectionsRef.current, [provider]: selection };
    modelSelectionsRef.current = next;
    setModelSelections(next);
  };
  const resetModelChoice = (provider: ModelProvider) => {
    if (!canEditModels(modelControlFor(provider))) return;
    const next = { ...modelSelectionsRef.current };
    delete next[provider];
    modelSelectionsRef.current = next;
    setModelSelections(next);
    setModelHint("Using your Mac’s default model and reasoning.");
  };
  const activeModel = modelProvider ? selectedModelFor(modelProvider) : null;
  let composerHint = preferences.sendShortcut === "enter" ? "Enter to send · Shift + Enter for a new line" : "⌘ / Ctrl + Enter to send · Enter for a new line";
  if (!online) composerHint = "Connect your Mac to send. Your draft stays here.";
  else if (checkingReadiness || snapshot?.startup?.phase === "checking") composerHint = "Checking your connections before sending.";
  else if (!ready) composerHint = `Connect ${mode === "rivune" ? "ChatGPT and Claude" : modeTitles[mode]} in the Mac app to use this mode.`;
  else if (!promptFits(draft)) composerHint = "This request exceeds the 16 KB limit. Shorten it before sending.";
  else if (pending) composerHint = "Waiting for the Mac to confirm the submitted request.";
  else if (running) composerHint = "You can draft your next message while this request runs.";

  const connectionSummary = !online ? "Mac not connected" : checkingReadiness || snapshot?.startup?.phase === "checking" ? "Checking connections" : `${readyCount} of 2 providers ready`;
  const modeSelector = <div className="ws-mode-switcher" role="group" aria-label="Choose intelligence">{(["rivune", "codex", "claude"] as const).map(choice => <button type="button" key={choice} aria-pressed={mode === choice} onClick={() => { setMode(choice); setShareWithTeam(false); }}><ProviderMark mode={choice} /><span className={choice === "rivune" ? "rivune-wordmark" : undefined}>{modeTitles[choice]}</span>{mode === choice && <i className="ws-choice-dot" aria-hidden="true" />}</button>)}</div>;
  const composerPanel = (
          <div className="ws-composer-area">
            {notice && <div className="ws-notice" role="alert"><span>{notice}</span><button className="ws-icon-button" onClick={() => setNotice("")} aria-label="Dismiss notice"><Icon name="close" size={14} /></button></div>}
            <form className="ws-composer" onSubmit={send}>
              <textarea ref={composerRef} aria-label="Message" placeholder="Send a message" value={draft} rows={3} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (shouldSubmitMessage(preferences.sendShortcut, { key: event.key, shiftKey: event.shiftKey, metaKey: event.metaKey, ctrlKey: event.ctrlKey, altKey: event.altKey, isComposing: event.nativeEvent.isComposing })) { event.preventDefault(); if (canSend) void send(); } }} />
              <div className="ws-composer-controls">
                {modeSelector}
                <button className="ws-composer-models" type="button" onClick={event => openModelControls(mode === "claude" ? "claude" : "codex", event.currentTarget)} aria-label="Models & reasoning" aria-haspopup="dialog" aria-expanded={!!modelProvider} aria-controls="ws-model-dialog" title="Choose models and reasoning for your next message"><Icon name="sliders" size={14} /><span>Models<span className="ws-models-detail"> & reasoning</span></span><Icon name="chevron" size={11} /></button>
                <button className="ws-send" type="submit" disabled={!canSend} aria-label="Send message" title={canSend ? "Send message" : composerHint}><Icon name="arrow" size={19} /></button>
              </div>
              {mode === "rivune" && !!draft.trim() && <label className="ws-team-consent"><input type="checkbox" checked={shareWithTeam} onChange={event => setShareWithTeam(event.target.checked)} /><span>Share this request and recent context with ChatGPT and Claude.</span></label>}
            </form>
            <p className="ws-composer-hint">{!online ? <><button type="button" onClick={openConnections}>Connect your Mac</button> to send. Your draft stays here.</> : composerHint}</p>
          </div>
  );
  const pendingCard = visiblePending && <article className="ws-turn ws-pending-turn"><div className="ws-user-message"><p>{pending.prompt}</p></div><div className="ws-submission-status" role="status"><ProviderMark mode={pending.mode} /><div><strong>{pending.state === "uncertain" ? "Checking whether the request arrived" : pending.state === "confirming" ? "Waiting for the Mac’s run record" : "Sending to your Mac…"}</strong><p>{pending.state === "uncertain" ? "The connection changed before receipt was confirmed. This request will not be sent again automatically; reconnect to check its status." : "Your draft is kept until the Mac confirms receipt."}</p><small>Request {pending.id.slice(0,8)}</small></div></div></article>;
  const emptyWork = <div className="ws-work-empty"><span className="ws-empty-icon"><Icon name="conversations" size={22} /></span><div><strong>{snapshot ? "Your next idea starts here." : "Your work, ready when you are."}</strong><p>{snapshot ? "Send your first request and your recent conversations will appear here." : "Connect Rivune on your Mac to see your conversations and continue your work."}</p></div></div>;

  return <main style={{"--background-dim": preferences.backgroundDim} as CSSProperties} data-stars={preferences.stars ? "on" : "off"} data-galaxy={preferences.galaxy ? "on" : "off"} data-motion={preferences.motion} data-text-size={preferences.textSize} className={`ws-app ws-app--workbench${sidebarCollapsed ? " ws-app--sidebar-collapsed" : ""}${showSidebar ? " ws-app--sidebar-open" : ""}${showActivity ? " ws-app--activity-open" : ""}`}>
    <SpaceField />
    {showSidebar && <button className="ws-sidebar-scrim" onClick={() => setShowSidebar(false)} aria-label="Close conversations" />}
    <aside className="ws-sidebar" aria-label="Workspace navigation">
      <div className="ws-brand-row"><button className="ws-brand" onClick={() => selectConversation(null)} aria-label="Rivune home"><ProviderMark mode="rivune" /><span className="rivune-wordmark" role="img" aria-label="Rivune">Rivune</span></button><button className="ws-icon-button ws-collapse-sidebar" onClick={() => setSidebarCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar"><Icon name="sidebar" size={20} /></button></div>
      <div className="ws-workspace-container">
        <button className="ws-new-conversation" onClick={() => selectConversation(null)}><Icon name="plus" size={17} /><span>New conversation</span></button>
        <nav className="ws-workspace-nav" aria-label="Workspace sections">
          <button className={!showSettings && surface === "conversations" ? "is-selected" : ""} aria-current={!showSettings && surface === "conversations" ? "page" : undefined} onClick={browseConversations}><Icon name="conversations" size={17} /><span>Conversations</span>{conversations.length > 0 && <small>{conversations.length}</small>}</button>
        </nav>
        {conversations.length > 0 && <div className="ws-sidebar-search-row"><label className="ws-sidebar-search"><Icon name="search" size={15} /><input type="search" placeholder="Find a conversation" aria-label="Search workspace conversations" value={search} onChange={event => setSearch(event.target.value)} /></label></div>}
        <div className="ws-workspace-header"><strong>Recent</strong>{conversations.length > 0 && <button onClick={browseConversations}>View all</button>}</div>
        <div className="ws-conversations">
          {!!drafts.new?.trim() && !search.trim() && <button className={`ws-current-draft${!showSettings && surface === "home" ? " is-selected" : ""}`} onClick={() => { selectConversation(null); composerRef.current?.focus(); }}><Icon name="conversations" size={15} /><span className="ws-conversation-title">Untitled draft</span><small>Draft</small></button>}
          {(showAllSidebarChats || search.trim() ? filteredConversations : filteredConversations.slice(0,8)).map(item => <button key={item.id} className={!showSettings && surface === "conversation" && selectedID === item.id ? "is-selected" : ""} onClick={() => selectConversation(item.id)} aria-current={!showSettings && surface === "conversation" && selectedID === item.id ? "page" : undefined}><Icon name="conversations" size={15} /><span className="ws-conversation-title">{item.title || "Untitled conversation"}</span>{snapshot?.runs.some(run => run.conversationID === item.id && run.status === "running") && <i className="ws-conversation-running" aria-label="Running" />}</button>)}
          {!search.trim() && filteredConversations.length > 8 && <button onClick={()=>setShowAllSidebarChats(!showAllSidebarChats)}>{showAllSidebarChats ? "Show fewer" : `Show all ${filteredConversations.length} conversations`}</button>}
          {search.trim() && !filteredConversations.length && <p className="ws-sidebar-empty">No matching conversations.</p>}
          {!conversations.length && !search.trim() && !drafts.new?.trim() && <p className="ws-sidebar-empty">No conversations yet.</p>}
        </div>
        <div className="ws-sidebar-bottom">
          {snapshot?.hasMoreHistory && <p className="ws-history-note">Recent history shown. Open the Mac app for older messages.</p>}
          <button className={`ws-sidebar-utility${showSettings && settingsSection === "connections" ? " is-selected" : ""}`} onClick={openConnections} title={connectionSummary} aria-current={showSettings && settingsSection === "connections" ? "page" : undefined}><Icon name="link" size={17} /><span>Connections</span><i className={`ws-state-dot${online && readyCount > 0 ? " is-online" : ""}`} aria-hidden="true" /></button>
          <div className="ws-app-footer"><button className={showSettings && settingsSection !== "connections" ? "is-selected" : ""} onClick={openSettings}><Icon name="sliders" size={17} /><span>Settings</span></button><button className="ws-footer-replay" onClick={replayStartup} aria-label="Replay arrival" title="Replay arrival"><Icon name="replay" size={15} /></button></div>
        </div>
      </div>
    </aside>

    <div className="ws-main">
      <SpaceField />
      <header className="ws-toolbar"><div className="ws-toolbar-title"><button className="ws-icon-button ws-mobile-menu" aria-label="Show navigation" aria-expanded={showSidebar} onClick={() => { setShowSidebar(!showSidebar); setSidebarCollapsed(false); }}><Icon name="sidebar" /></button>{sidebarCollapsed && <button className="ws-icon-button ws-expand-sidebar" aria-label="Expand sidebar" onClick={() => setSidebarCollapsed(false)}><Icon name="sidebar" /></button>}<h1>{showSettings ? settingsTitle(settingsSection) : surface === "home" ? "Home" : surface === "conversations" ? "Conversations" : conversation?.title || "Conversation"}</h1>{!showSettings && surface === "conversation" && <span className="ws-current-title">{mode === "rivune" ? "Rivune" : modeTitles[mode]}</span>}</div><div className="ws-toolbar-actions">{online && <button className={`ws-header-status${readyCount > 0 ? " is-ready" : ""}`} onClick={openConnections}><i aria-hidden="true" />{connectionSummary}</button>}{!showSettings && surface === "conversation" && <button className="ws-icon-button" aria-label="Open conversation in Mac app" title="Open in Mac app" disabled={!selectedID || !online || openingNative} onClick={openNative}><Icon name="external" /></button>}{!showSettings && <button className={`ws-icon-button${showActivity ? " is-active" : ""}`} aria-label="Show activity and connections" title="Activity and connections" aria-expanded={showActivity} onClick={() => setShowActivity(!showActivity)}><Icon name="sliders" /></button>}</div></header>
      {connectionError && <div className="ws-notice ws-connection-notice" role="status">{connectionError}<button onClick={showConnection}>Connection settings</button></div>}
      <div className="ws-content-layout">
        <section className={`ws-chat ws-chat--${showSettings ? "settings" : surface}`} aria-label={showSettings ? "Application settings" : surface === "home" ? "Workspace home" : surface === "conversations" ? "Your conversations" : "Conversation"}>
          {showSettings && <WorkspaceSettings connectionRequest={connectionRequest} section={settingsSection} onSection={selectSettingsSection} onClose={() => setShowSettings(false)} accountAccess={accountAccess} snapshot={snapshot} online={online} paired={!!connection} checking={checkingReadiness} modelSelections={modelSelections} modelControlsLocked={modelControlsLocked} preferences={preferences} onPreferences={updatePreferences} preferencesTemporary={storageFailed} onPair={showConnection} onDisconnect={disconnect} onCheck={() => void checkReadiness()} onSetup={() => setShowSetup(true)} onReplay={replayStartup} onModels={openModelControls} onNativeSettings={section => void openNativeSettings(section)} nativeBusy={nativeSettingsBusy} nativeNotice={nativeSettingsNotice} />}<div className={`ws-workspace-surface${showSettings ? " is-hidden" : ""}`} inert={showSettings}>
          {surface === "home" ? <div className="ws-dashboard-scroll"><div className="ws-home"><div className="ws-home-content"><h2>Start with a thought.</h2><p className="ws-home-description">A thought, a question, or something worth building.</p>{composerPanel}{!draft.trim() && <section className="ws-prompt-shortcuts" aria-label="Conversation starters">{suggestions.map(item => <button type="button" key={item.label} title={item.detail} onClick={() => { setDraft(item.prompt); composerRef.current?.focus(); }}><Icon name={item.icon} size={15} /><span>{item.label}</span></button>)}</section>}{conversations.length > 0 && <section className="ws-home-recents"><div><h3>Pick up where you left off</h3><button onClick={browseConversations}>View all <span aria-hidden="true">↗</span></button></div>{conversations.slice(0,3).map(item => <button key={item.id} onClick={() => selectConversation(item.id)}><Icon name="conversations" size={16} /><span>{item.title || "Untitled conversation"}</span><small>{modeTitles[item.mode]}</small><Icon name="chevron" size={13} /></button>)}</section>}{pendingCard && <div className="ws-home-pending">{pendingCard}</div>}</div></div></div> : surface === "conversations" ? <div className="ws-dashboard-scroll"><div className="ws-library"><div className="ws-library-heading"><div><p className="ws-eyebrow">YOUR WORKSPACE</p><h2>Conversations</h2><p>Good ideas are worth coming back to.</p></div><button className="ws-library-new" onClick={() => selectConversation(null)}><Icon name="plus" size={16} />New conversation</button></div><label className="ws-search"><Icon name="search" size={17} /><input type="search" aria-label="Search conversations" placeholder="Find a conversation…" value={search} onChange={event => setSearch(event.target.value)} /><span>{filteredConversations.length}</span></label>{conversations.length ? filteredConversations.length ? <WorkCards items={filteredConversations} latestRuns={latestRuns} online={online} onSelect={selectConversation} /> : <div className="ws-search-empty"><Icon name="search" size={22} /><strong>No conversations found</strong><p>Try another title or clear your search.</p><button className="ws-text-button" onClick={() => setSearch("")}>Clear search</button></div> : emptyWork}{snapshot?.hasMoreHistory && <p className="ws-recent-history-note">Recent history shown. Open the Mac app for older messages.</p>}</div></div> : <>

          <div className="ws-chat-scroll">
            <div className={`ws-thread${!runs.length && !visiblePending ? " ws-thread--empty" : ""}`}>
              {!runs.length && !visiblePending ? <div className="ws-welcome ws-older-history"><ProviderMark mode={conversation?.mode ?? "rivune"} large /><h2>{snapshot?.hasMoreHistory ? "Pick up where you left off." : "Room for the next thought."}</h2><p className="ws-welcome-description">{snapshot?.hasMoreHistory ? "This conversation’s messages are outside the recent browser history. Open it in Rivune to see the full conversation." : "There are no messages in this conversation yet. Start with a question or an idea."}</p>{snapshot?.hasMoreHistory && <button className="ws-connect-primary" onClick={openNative} disabled={!online || openingNative}><Icon name="external" size={16} /> Open in Mac app</button>}</div> : runs.map(run => <article className="ws-turn" key={run.id}>
                <div className="ws-user-message"><p>{run.prompt}</p></div>
                <div className="ws-answer-header"><ProviderMark mode={run.mode} /><strong>{modeTitles[run.mode]}</strong><span className={`ws-run-status ws-run-status--${run.status}`}>{!online && run.status === "running" ? "Last seen working" : statusTitles[run.status]}</span>
                  {run.status === "running" && online && <button className="ws-stop-inline" disabled={cancellingID === run.id} onClick={() => cancelRun(run.id)}><Icon name="stop" size={13} />{cancellingID === run.id ? "Stopping…" : "Stop"}</button>}
                </div>
                {run.result ? <ResultBody content={run.result} /> : run.status === "running" ? <div className="ws-working" role="status"><span className={online ? "ws-working-dot" : "ws-paused-dot"} /><span>{online ? friendlyStage(run.stage) : "Reconnect to receive the latest progress."}</span></div> : !run.error && <p className="ws-muted-result">{run.status === "complete" ? "This request completed without text to display." : "This request ended before a result was returned."}</p>}
                {run.error && <div className="ws-run-error">{run.error}</div>}
                {run.resultTruncated && <div className="ws-excerpt-note">Excerpt shown. <button onClick={openNative} disabled={!online}>Open in the Mac app for the full result ↗</button></div>}
                {run.status === "complete" && <div className="ws-answer-footer"><span>{run.mode === "rivune" ? run.activities?.length ? "Collaboration record available in Activity" : "Completed on your Mac" : "Direct response"}</span><button onClick={() => { setActivityRunID(run.id); setShowActivity(true); }}>{run.mode === "rivune" ? "View contributions & reviews" : "View activity"} <span aria-hidden="true">↗</span></button></div>}
              </article>)}
              {pendingCard}
              <div ref={bottomRef} />
            </div>
          </div>
          {composerPanel}
          </>}
          </div>
        </section>
        {!showSettings && showActivity && <aside className="ws-activity" aria-label="Activity and connections">
          <div className="ws-activity-heading"><h2>Behind the answer</h2><button className="ws-icon-button" onClick={() => setShowActivity(false)} aria-label="Close activity"><Icon name="close" size={16} /></button></div>
          <p className="ws-activity-caption">A clear view of what is connected and what happened.</p>
          <h3>CONNECTIONS</h3>
          {snapshot?.connections.length ? snapshot.connections.map(item => <div className="ws-provider-row" key={item.id}><ProviderMark mode={item.provider === "claude" ? "claude" : "codex"} /><div><strong>{item.title}</strong><small>{online ? item.state === "ready" ? "Ready on your Mac" : item.message || item.state : "Last known state · offline"}</small></div><span className={`ws-state-dot${online && item.state === "ready" ? " is-online" : ""}`} /></div>) : <p className="ws-activity-empty">Your connections appear after you connect this browser to Rivune.</p>}
          <div className="ws-execution-note"><Icon name="link" size={16} /><div><strong>Runs on your Mac</strong><p>Provider sign-ins and API keys stay on your Mac. Keep Rivune open to use this connection.</p></div></div>
          <h3>{activityRunID ? "REQUEST ACTIVITY" : "LATEST REQUEST"}</h3>
          {activityRun ? <><div className="ws-activity-run"><span className={`ws-run-status ws-run-status--${activityRun.status}`}>{!online && activityRun.status === "running" ? "Last seen working" : statusTitles[activityRun.status]}</span><p>{activityRun.prompt}</p><small>{modeTitles[activityRun.mode]} · {new Date(activityRun.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</small></div>{activityRun.activities?.length ? activityRun.activities.map((item,index) => <details className="ws-activity-record" key={`${activityRun.id}-${index}`}><summary>{item.title}</summary><div>{item.body}</div></details>) : <p className="ws-activity-empty">{activityRun.status === "running" ? "Further details will appear when the Mac reports them." : "No additional activity was included with this run."}</p>}</> : <p className="ws-activity-empty">Start a conversation to see its progress and review record here.</p>}
          <div className="ws-sync-note"><strong>Local connection</strong><p>Cross-device synchronization is not connected in this build.</p></div>
        </aside>}
      </div>
    </div>

    {showStartup && <WorkspaceStartup snapshot={snapshot} online={online} checking={connecting || checkingReadiness} onFinish={finishStartup} />}
    <WorkspaceSetup connectionRequest={connectionRequest} onNativeConnections={online && snapshot?.capabilities?.settingsNavigation ? () => void openNativeSettings("connections") : undefined} locked={modelControlsLocked} open={!showStartup && (showSetup || !accountReady)} accountAccess={accountAccess} snapshot={snapshot} online={online} checking={connecting || checkingReadiness} onPairMac={showConnection} onRecheck={() => void checkReadiness()} onEnter={() => { if (accountReady && online && !checkingReadiness && snapshot?.startup?.phase !== "checking" && readyCount > 0) { setMode(current => preferredReadyMode(current, snapshot?.connections ?? [])); setShowSetup(false); } }} onPreview={() => setShowSetup(false)} />

    <dialog id="ws-model-dialog" ref={modelDialogRef} className="ws-model-dialog" style={{ left: modelPanelPosition.left, top: modelPanelPosition.top, maxHeight: `calc(100dvh - ${modelPanelPosition.top + 16}px)` }} aria-labelledby="ws-model-dialog-title" onCancel={() => setModelProvider(null)} onClick={event => { if (event.target === event.currentTarget) setModelProvider(null); }}>
      {modelProvider && <div className="ws-model-panel">
        <header><div><p>MODELS & REASONING</p><h2 id="ws-model-dialog-title"><ProviderMark mode={modelProvider} />{modeTitles[modelProvider]}<span>{!online ? "Not connected" : activeModel?.control.transport === "api" ? "API" : activeModel ? "CLI" : "Mac defaults"}</span></h2></div><button className="ws-icon-button" aria-label="Close models and reasoning" onClick={() => setModelProvider(null)}><Icon name="close" size={18} /></button></header>
        <div className="ws-model-provider-tabs" role="group" aria-label="Choose provider settings">{(["codex", "claude"] as const).map(provider => <button key={provider} onClick={() => { setModelProvider(provider); setModelHint(""); }} aria-pressed={modelProvider === provider}><ProviderMark mode={provider} />{modeTitles[provider]}</button>)}</div>
        {online ? <div className="ws-model-columns">
          <fieldset disabled={!canEditModels(activeModel?.control)}><legend>Models</legend><div className="ws-model-option-list">
            {online && activeModel?.control.models.length ? activeModel.control.models.map(option => <label className={`ws-model-option${activeModel.selection.model === option.id ? " is-selected" : ""}`} key={option.id}><input type="radio" name={`${modelProvider}-model`} value={option.id} checked={activeModel.selection.model === option.id} onChange={() => {
              const next = chooseModel(activeModel.control, activeModel.selection, option.id);
              if (!next) return;
              setModelChoice(modelProvider, next);
              setModelHint(next.reasoning !== activeModel.selection.reasoning ? `Reasoning changed to ${activeModel.control.reasoning.find(item => item.id === next.reasoning)?.label || next.reasoning} for this model.` : "");
            }} /><span>{option.label}</span><Icon name="check" size={13} /></label>) : <div className="ws-model-options-empty"><Icon name="code" size={22} /><p>{online ? "No models available" : "Your connected models"}</p><small>{online ? "Configure a model on your Mac." : "Loaded from your Mac"}</small></div>}
          </div></fieldset>
          <fieldset disabled={!canEditModels(activeModel?.control)}><legend>Reasoning</legend><div className="ws-model-option-list">
            {online && activeModel?.control.reasoning.length ? activeModel.control.reasoning.map(option => {
              const supported = activeModel.control.models.find(item => item.id === activeModel.selection.model)?.reasoningIds.includes(option.id) ?? false;
              return <label className={`ws-model-option${activeModel.selection.reasoning === option.id ? " is-selected" : ""}${!supported ? " is-unavailable" : ""}`} key={option.id} title={!supported ? "Unavailable for the selected model" : undefined}><input type="radio" name={`${modelProvider}-reasoning`} value={option.id} checked={activeModel.selection.reasoning === option.id} disabled={!supported} onChange={() => { setModelChoice(modelProvider, { ...activeModel.selection, reasoning: option.id }); setModelHint(""); }} /><span>{option.label}</span><Icon name="check" size={13} /></label>;
            }) : <div className="ws-model-options-empty"><Icon name="idea" size={22} /><p>Reasoning options</p><small>{online ? "Set by the connected model" : "Loaded from your Mac"}</small></div>}
          </div></fieldset>
        </div> : <div className="ws-model-connect-state"><Icon name="link" size={20} /><p>Connect the Mac app to load your models and their reasoning options.</p></div>}
        <footer><p role="status">{modelHint || modelControlMessage(activeModel?.control)}</p>{activeModel?.control.editable && activeModel.control.note && <small>{activeModel.control.note}</small>}<div>{!online ? <button className="ws-model-connect" onClick={() => { setModelProvider(null); showConnection(); }}>Connect your Mac<Icon name="link" size={13} /></button> : modelSelections[modelProvider] && canEditModels(activeModel?.control) ? <button onClick={() => resetModelChoice(modelProvider)}>Use Mac defaults</button> : <span>{modelSelections[modelProvider] ? "Workspace selection" : activeModel?.control.editable ? "Using Mac defaults" : "Managed in the Mac app"}</span>}<button className="ws-model-done" onClick={() => setModelProvider(null)}>Done</button></div></footer>
      </div>}
    </dialog>

    <dialog ref={dialogRef} className="ws-connect-dialog" aria-labelledby="ws-connect-title" onCancel={() => { connectionGeneration.current += 1; setConnecting(false); setDialogOpen(false); }}>
      <button className="ws-icon-button ws-dialog-close" aria-label="Close connection settings" onClick={() => { connectionGeneration.current += 1; setConnecting(false); setDialogOpen(false); }}><Icon name="close" /></button>
      <div className="ws-dialog-mark"><ProviderMark mode="rivune" /></div>
      <p className="ws-eyebrow">WORKSPACE CONNECTION</p><h2 id="ws-connect-title">Connect your Mac</h2><p className="ws-dialog-description">Link this browser to the Rivune app running on the same Mac. The Mac finds your CLI tools, stores API keys in Keychain, and runs your chats. This is separate from signing in to your Rivune account.</p>
      {online && <div className="ws-connected-summary"><span className="ws-state-dot is-online" /><span>Connected to {snapshot?.device.name || "your Mac"}</span><button onClick={disconnect}>Disconnect</button></div>}
      <ol className="ws-connect-steps"><li><span>1</span>Open Rivune on your Mac.</li><li><span>2</span>Enable browser access in Browser connection.</li><li><span>3</span>Copy the connection code and paste it below.</li></ol>
      <form onSubmit={connect}><label htmlFor="rivune-connection-code">Connection code</label><textarea id="rivune-connection-code" value={connectionInput} onChange={event => setConnectionInput(event.target.value)} placeholder="Paste the code from the Mac app" spellCheck={false} autoComplete="off" autoCapitalize="none" autoCorrect="off" rows={3} required />{dialogError && <p className="ws-dialog-error" role="alert">{dialogError}</p>}<button className="ws-connect-submit" disabled={!connectionInput.trim() || connecting}>{connecting ? "Connecting…" : "Connect workspace"}<span aria-hidden="true">↗</span></button></form>
      <p className="ws-dialog-footnote">The code lets this tab use your local conversations and manage AI connections on this Mac. Paste the Mac app’s connection code here, never an API key. It stays in this tab’s memory and is cleared when you reload. Mac pairing is separate from your Rivune account sign-in.</p>
    </dialog>
  </main>;
}
