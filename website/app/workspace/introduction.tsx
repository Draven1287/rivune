"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ProviderMark from "./provider-mark";

const introductionKey = "rivune.introduction.seen.v2";
const introductionEvent = "rivune-introduction-change";
let dismissedThisSession = false;
function subscribeToIntroduction(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(introductionEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(introductionEvent, callback);
  };
}
function introductionSeen() {
  if (dismissedThisSession) return true;
  try { return window.localStorage.getItem(introductionKey) === "seen"; }
  catch { return false; }
}
export function useIntroductionSeen() {
  return useSyncExternalStore(subscribeToIntroduction, introductionSeen, () => false);
}
export function markIntroductionSeen() {
  dismissedThisSession = true;
  try { window.localStorage.setItem(introductionKey, "seen"); } catch { /* Replay still works if storage is unavailable. */ }
  window.dispatchEvent(new Event(introductionEvent));
}

function TourIcon({ kind }: { kind: "arrow" | "close" | "terminal" | "key" | "shield" | "chat" | "history" | "link" }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
    key: <><circle cx="8" cy="8" r="5" /><path d="m12 12 9 9m-5-5 3-3m-7-1 3-3" /></>,
    shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    chat: <path d="M4 4h16v13H9l-5 4Z" />,
    history: <><path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-5v6l4 2" /></>,
    link: <><path d="m9 15 6-6M9 17l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m2-3 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0" /></>,
  };
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

const features = [
  {
    title: "Better thinking, together.",
    illustration: "Two perspectives. One conversation.",
    description: "Ask ChatGPT or Claude directly, or bring both into a Rivune team request. Choose the perspective your work needs.",
    items: [
      ["chat", "Direct conversations", "Choose ChatGPT or Claude"],
      ["terminal", "Rivune team", "Bring both perspectives together"],
      ["history", "Review the work", "See the activity the Mac reports"],
      ["shield", "Share deliberately", "Team requests need your consent"],
    ],
  },
  {
    title: "Your Mac. Your workspace.",
    illustration: "One local connection.",
    description: "Pair this browser with Rivune on the same Mac. Your installed Codex and Claude tools handle requests through their providers.",
    items: [
      ["link", "Local pairing", "Use a code from the Mac app"],
      ["key", "Existing sign-ins", "Managed in your installed tools"],
      ["terminal", "Runs on your Mac", "Keep Rivune open while working"],
      ["shield", "Temporary access", "Reloading clears the browser code"],
    ],
  },
  {
    title: "Keep the conversation going.",
    illustration: "Make room for the next idea.",
    description: "Find recent conversations, return to a thought, and keep drafting as you move around your workspace.",
    items: [
      ["history", "Recent history", "Received from the Mac app"],
      ["chat", "Find a conversation", "Search your conversation titles"],
      ["terminal", "Readable results", "Copy returned code when useful"],
      ["link", "Open on your Mac", "See older or longer results there"],
    ],
  },
  {
    title: "A clear view of every request.",
    illustration: "Stay close to the work.",
    description: "See connection state and reported activity, stop an active request, and decide when to share context with both providers.",
    items: [
      ["shield", "Explicit sharing", "Consent for each team request"],
      ["history", "Visible activity", "Read the Mac’s reported record"],
      ["terminal", "Request control", "Stop from the conversation"],
      ["link", "Honest connection state", "Offline work is labelled clearly"],
    ],
  },
] as const;

type IntroductionStage = "splash" | "connection" | "privacy" | "features";
export default function WorkspaceIntroduction({ onClose, onConnect, connected }: { onClose: () => void; onConnect: () => void; connected: boolean }) {
  const [stage, setStage] = useState<IntroductionStage>("splash");
  const [slide, setSlide] = useState(0);
  const [apiInfo, setAPIInfo] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const feature = features[slide];
  return <dialog ref={dialog} className={`ws-intro ws-intro--${stage}`} onCancel={onClose} aria-labelledby="introduction-title">
    {stage !== "features" && <button className="ws-intro-close" onClick={onClose} aria-label="Skip introduction" title="Skip introduction"><TourIcon kind="close" /></button>}
    {stage === "splash" ? <div className="ws-intro-splash">
      <span className="ws-splash-caption ws-splash-caption--top">YOUR WORKSPACE, CONNECTED</span>
      <span className="ws-splash-caption ws-splash-caption--left">ROOM TO THINK</span>
      <span className="ws-splash-caption ws-splash-caption--right">A LITTLE MORE POSSIBLE</span>
      <div className="ws-splash-center"><h1 id="introduction-title">RIVUNE</h1><span className="ws-splash-mark" aria-hidden="true" /><button onClick={() => setStage("connection")}>Continue <TourIcon kind="arrow" /></button></div>
      <p className="ws-splash-footer">Welcome to your workspace</p>
    </div> : stage === "connection" ? <div className="ws-intro-setup">
      <h1 id="introduction-title">How would you like to connect?</h1><p className="ws-intro-subtitle">Choose how Rivune will reach your intelligence.</p>
      <div className="ws-method-options"><button className={`ws-method-card${connected ? " is-connected" : ""}`} onClick={onConnect}><span className="ws-method-icon"><TourIcon kind="terminal" /></span><strong>Connect your Mac</strong><span className="ws-method-label">LOCAL WORKSPACE CONNECTION</span><p>Use your CLI sign-ins or API connections on your Mac. Provider credentials stay in the Mac app.</p><span className="ws-method-action">{connected ? "Mac connected · Manage connection" : "Pair with the Mac app"}<TourIcon kind="arrow" /></span></button><button className={`ws-method-card ws-method-card--unavailable${apiInfo ? " is-selected" : ""}`} onClick={() => setAPIInfo(!apiInfo)} aria-expanded={apiInfo}><span className="ws-method-icon"><TourIcon kind="key" /></span><strong>Use an API key</strong><span className="ws-method-label">CONFIGURED IN THE MAC APP</span><p>Set up OpenAI or Anthropic API access in Rivune on your Mac, then pair this browser with your workspace.</p><span className="ws-method-action">Learn about this option<TourIcon kind="arrow" /></span></button></div>
      {apiInfo && <p className="ws-method-info" role="status">API access is separate from a provider subscription. After pairing your Mac, open Settings → AI Connections to add a key and model. The key is saved in Mac Keychain.</p>}
      <button className="ws-intro-continue" onClick={() => setStage("privacy")}>{connected ? "Continue" : "Explore the workspace first"}<TourIcon kind="arrow" /></button>
      <p className="ws-intro-quiet">You can connect your Mac later from the workspace sidebar.</p>
    </div> : stage === "privacy" ? <div className="ws-intro-privacy">
      <h1 id="introduction-title">Data Handling & Privacy</h1><p className="ws-intro-subtitle">A clear view of where your information goes and what you control.</p>
      <div className="ws-privacy-rows">
        <section><h2>Model providers</h2><div><span className="ws-privacy-icon"><TourIcon kind="terminal" /></span><div><strong>ChatGPT and Claude</strong><p>Requests run through CLI tools or API connections on your Mac. Prompts and shared context are sent to the selected providers.</p></div></div></section>
        <section><h2>Browser connection</h2><div><span className="ws-privacy-icon"><TourIcon kind="link" /></span><div><strong>A temporary connection to Rivune</strong><p>Your pairing code stays in this tab’s memory. Reload the page to clear it, or disable browser access in the Mac app to revoke it.</p></div></div></section>
        <section><h2>Your conversations</h2><div><span className="ws-privacy-icon"><TourIcon kind="shield" /></span><div><strong>Recent history from your Mac</strong><p>This browser displays a limited history window. Team requests share recent context with both providers only after you check the consent box.</p></div></div></section>
      </div><p className="ws-privacy-footnote">The introduction preference is saved in this browser. Connection codes and drafts are not saved across reloads.</p>
      <button className="ws-privacy-next" onClick={() => setStage("features")} aria-label="Continue to workspace introduction"><TourIcon kind="arrow" /></button>
    </div> : <div className="ws-feature-card">
      <div className="ws-feature-illustration"><div className="ws-illustration-windows" aria-hidden="true"><div><div className="ws-mini-titlebar"><i /><i /><i /><span>Rivune · Perspectives</span></div><div className="ws-mini-provider"><ProviderMark mode="codex" /><span>ChatGPT</span></div><div className="ws-mini-line" /><div className="ws-mini-line ws-mini-line--short" /><div className="ws-mini-provider"><ProviderMark mode="claude" /><span>Claude</span></div><div className="ws-mini-line" /><div className="ws-mini-line ws-mini-line--short" /></div><div><div className="ws-mini-titlebar"><i /><i /><i /><span>Rivune · Workspace</span></div><span className="ws-mini-rivune" /><div className="ws-mini-line" /><div className="ws-mini-line ws-mini-line--short" /></div></div><div className="ws-illustration-fade" /><strong>{feature.illustration}</strong><span>WORKSPACE FEATURE OVERVIEW</span><button className="ws-feature-next-arrow" onClick={() => setSlide((slide + 1) % features.length)} aria-hidden="false" aria-label="Next feature"><TourIcon kind="arrow" /></button></div>
      <div className="ws-feature-body"><span className="ws-feature-badge"><i />Workspace introduction</span><h1 id="introduction-title">{feature.title}</h1><p className="ws-feature-description">{feature.description}</p><div className="ws-feature-grid">{feature.items.map(([icon,title,description]) => <div key={title}><span><TourIcon kind={icon} /></span><div><strong>{title}</strong><p>{description}</p></div></div>)}</div><button className="ws-feature-cta" onClick={() => slide < features.length - 1 ? setSlide(slide + 1) : onClose()}>{slide < features.length - 1 ? "Continue the introduction" : "Open workspace"}</button><p className="ws-feature-quiet">A quick look around. No permissions or provider calls are enabled here.</p><div className="ws-feature-dots" aria-label="Introduction pages">{features.map((item,index) => <button key={item.title} className={slide === index ? "is-active" : ""} onClick={() => setSlide(index)} aria-label={`Show introduction page ${index + 1}`} aria-current={slide === index ? "step" : undefined} />)}</div><button className="ws-feature-dismiss" onClick={onClose}>Dismiss for now</button></div>
    </div>}
  </dialog>;
}
