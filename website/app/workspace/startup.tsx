"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { startupState, type WorkspaceSnapshot } from "./client-contract";
import { arrivalDurationMs, arrivalPresentation, arrivalHandoffDelayMs } from "./arrival-contract";

// Stable points avoid a random reshuffle on every connection status update.
const stars = Array.from({ length: 240 }, (_, index) => ({
  left: `${((index * 73.17 + 13) % 100).toFixed(2)}%`,
  top: `${((index * 37.71 + 7) % 100).toFixed(2)}%`,
  opacity: .22 + ((index * 17) % 42) / 100,
  width: index % 19 === 0 ? 2 : 1,
  height: index % 19 === 0 ? 2 : 1,
}));
export function SpaceField() {
  return <div className="ws-space-field" aria-hidden="true">{stars.map((style, index) => <i key={index} style={style} />)}</div>;
}

export default function WorkspaceStartup({ snapshot, online, checking, onFinish }: {
  snapshot: WorkspaceSnapshot | null; online: boolean; checking: boolean;
  onFinish: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const state = startupState(snapshot, online, checking);
  const arrival = arrivalPresentation(elapsed, state.phase, assetsLoaded);
  const finishAction = useRef(onFinish);
  const didFinish = useRef(false);
  const finishOnce = useCallback(() => {
    if (didFinish.current) return;
    didFinish.current = true;
    finishAction.current();
  }, []);
  useEffect(() => { finishAction.current = onFinish; }, [onFinish]);
  useEffect(() => {
    dialog.current?.showModal();
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed(performance.now() - started), 50);
    let current = true;
    const artwork = new Image();
    artwork.onload = () => { if (current) setAssetsLoaded(true); };
    artwork.onerror = () => { if (current) { setAssetError(true); setAssetsLoaded(true); } };
    artwork.src = "/brand/rivune-space.png";
    // A failed visual asset must not masquerade as a provider failure or trap setup.
    const assetTimeout = window.setTimeout(() => { if (current && !artwork.complete) { setAssetError(true); setAssetsLoaded(true); } }, 12_000);
    return () => { current = false; clearInterval(timer); clearTimeout(assetTimeout); artwork.onload = null; artwork.onerror = null; };
  }, []);
  useEffect(() => {
    if (!arrival.finished) return;
    const timer = window.setTimeout(finishOnce, arrivalHandoffDelayMs);
    return () => clearTimeout(timer);
  }, [arrival.finished, finishOnce]);
  const title = arrival.ready ? "Ready for your next idea." : arrival.finished ? "Welcome to Rivune." : "Preparing your workspace.";
  const detail = arrival.finished ? arrival.ready ? "Opening your workspace…" : "Opening setup to connect your AI…" : state.phase === "ready" ? "Connections checked. Bringing everything into view." : online ? state.message : "Bringing everything into view. Connection setup comes next.";
  return <dialog ref={dialog} className={`ws-arrival ws-arrival--welcome${assetError ? " has-artwork-error" : ""}`} style={{"--arrival-duration":`${arrivalDurationMs}ms`} as CSSProperties} aria-labelledby="ws-arrival-title" onCancel={event => { event.preventDefault(); if (arrival.finished) finishOnce(); }}>
    <SpaceField /><div className="ws-arrival-haze" aria-hidden="true" />
    <header className="ws-arrival-top"><span className="rivune-wordmark" role="img" aria-label="Rivune">RIVUNE</span><span className="ws-arrival-edition">YOUR SPACE TO THINK</span></header>
    <div className="ws-arrival-center">
      <div className="ws-arrival-art" role="img" aria-label="Silver Rivune R with a luminous pearl and tilted silver ring, surrounded by planets and stars">
        <div className="ws-arrival-artwork"><div className="ws-arrival-poster" /></div>
        {assetError && <div className="ws-arrival-fallback" aria-label="Rivune">RIVUNE</div>}
        <span className="ws-arrival-count" aria-hidden="true">{arrival.percentage}%</span>
        <span className="ws-arrival-count ws-arrival-count--right" aria-hidden="true">{arrival.percentage}%</span>
      </div>
    </div>
    <footer className="ws-arrival-welcome-footer">
      <div className="ws-arrival-loading"><div className="ws-arrival-loading-label"><span>{arrival.finished ? "LOADED" : "LOADING"}</span><span>{arrival.percentage}%</span></div><progress max={100} value={arrival.percentage} aria-label="Loading Rivune" /></div>
      <div className="ws-arrival-welcome-status" role="status"><div><h1 id="ws-arrival-title">{title}</h1><p>{detail}</p></div></div>
    </footer>
    <span className="ws-arrival-side ws-arrival-side--left" aria-hidden="true">YOUR IDEAS</span><span className="ws-arrival-side ws-arrival-side--right" aria-hidden="true">MULTIPLE PERSPECTIVES</span>
  </dialog>;
}
