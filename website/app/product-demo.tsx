"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "Rivune" | "Direct";
type RunState = "idle" | "running" | "complete" | "stopped";

const examples = [
  {
    prompt: "Build a launch page for a native multi-AI workspace",
    label: "Product launch",
    result: "A restrained launch page with an honest capability table, a working product tour, and a clear source download.",
  },
  {
    prompt: "Review this product plan for hidden risks",
    label: "Plan review",
    result: "A prioritized review that separates product risk, implementation risk, and what still requires real-world validation.",
  },
  {
    prompt: "Turn my research into one recommendation",
    label: "Research decision",
    result: "One recommendation that preserves the strongest evidence, names unresolved uncertainty, and explains the decision.",
  },
];

const phases = [
  ["Brief", "Define the outcome and the evidence needed."],
  ["Assign", "Give each model a distinct, compatible responsibility."],
  ["Challenge", "Test gaps and resolve conflicting recommendations."],
  ["Deliver", "Return one coherent result with the work still inspectable."],
];

function Mark() {
  return <span className="mark mark--compact" aria-hidden="true" />;
}

export default function ProductDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("Rivune");
  const [runState, setRunState] = useState<RunState>("idle");
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const timers = useRef<number[]>([]);

  const example = examples[exampleIndex];
  const isRunning = runState === "running";

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const reset = (state: RunState = "idle") => {
    clearTimers();
    setRunState(state);
    setPhaseIndex(-1);
  };

  const chooseExample = (index: number) => {
    if (isRunning) return;
    setExampleIndex(index);
    reset();
  };

  const chooseMode = (nextMode: Mode) => {
    if (isRunning) return;
    setMode(nextMode);
    reset();
  };

  const play = () => {
    clearTimers();
    setRunState("running");
    setPhaseIndex(0);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepDuration = reducedMotion ? 1 : mode === "Rivune" ? 650 : 500;
    const lastPhase = mode === "Rivune" ? 3 : 1;

    for (let index = 1; index <= lastPhase; index += 1) {
      timers.current.push(
        window.setTimeout(() => {
          setPhaseIndex(mode === "Rivune" ? index : 3);
          if (index === lastPhase) setRunState("complete");
        }, stepDuration * index),
      );
    }
  };

  const stop = () => reset("stopped");

  return (
    <section className="product-frame" id="product-tour" aria-label="Guided product workflow">
      <div className="frame__top">
        <span className="traffic" aria-hidden="true"><i /><i /><i /></span>
        <span className="frame__title"><Mark /> Rivune preview</span>
        <span className="engine-state"><i /> Guided workflow</span>
      </div>

      <div className="demo-disclosure">
        <strong>Prewritten demonstration</strong>
        <span>No model request is sent from this page.</span>
      </div>

      <div className="workspace-preview">
        <aside className="mini-sidebar" aria-label="Example requests">
          <p>EXAMPLE REQUESTS</p>
          {examples.map((item, index) => (
            <button
              className={exampleIndex === index ? "is-active" : ""}
              disabled={isRunning}
              aria-pressed={exampleIndex === index}
              key={item.label}
              type="button"
              onClick={() => chooseExample(index)}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{item.label}</span>
            </button>
          ))}
          <div className="tour-status"><i /> Local interface preview</div>
        </aside>

        <div className="preview__main">
          <label className="compact-examples">
            Example request
            <select value={exampleIndex} disabled={isRunning} onChange={(event) => chooseExample(Number(event.target.value))}>
              {examples.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}
            </select>
          </label>
          <p className="demo-live-status" role="status" aria-live="polite" aria-atomic="true">
            {runState === "complete" ? `${mode} demonstration complete. The prewritten result is shown below.` : runState === "stopped" ? "Demonstration stopped. You can choose an example or play again." : isRunning ? `${mode} demonstration running.` : `${example.label}. Ready to play the ${mode} demonstration.`}
          </p>
          <header className="preview-toolbar">
            <span className="preview-title">{example.label}</span>
            <div className="mode-switch" role="group" aria-label="Choose demonstration mode">
              {(["Rivune", "Direct"] as Mode[]).map((item) => (
                <button
                  className={mode === item ? "selected" : ""}
                  disabled={isRunning}
                  type="button"
                  key={item}
                  aria-pressed={mode === item}
                  onClick={() => chooseMode(item)}
                >{item}</button>
              ))}
            </div>
          </header>

          <div className="demo-stage">
            {runState === "idle" || runState === "stopped" ? (
              <div className="preview__copy">
                <small>{runState === "stopped" ? "DEMONSTRATION STOPPED" : mode === "Rivune" ? "REVIEWED RUN" : "DIRECT RUN"}</small>
                <h2>{mode === "Rivune" ? "One request, clearly divided." : "Ask one connected model."}</h2>
                <p>{mode === "Rivune" ? "Each model gets a real responsibility. The final answer is written only after both contributions are checked." : "Use one model when the task does not benefit from a second perspective."}</p>
              </div>
            ) : (
              <div className="run-view">
                <div className="run-summary">
                  <small>{runState === "complete" ? "RUN COMPLETE" : "RUNNING"}</small>
                  <h3>{example.prompt}</h3>
                </div>

                {mode === "Rivune" ? (
                  <>
                    <ol className="phase-list">
                      {phases.map(([title, detail], index) => (
                        <li
                          className={index < phaseIndex || runState === "complete" ? "is-done" : index === phaseIndex ? "is-current" : ""}
                          aria-current={index === phaseIndex && runState !== "complete" ? "step" : undefined}
                          key={title}
                        >
                          <span>{index < phaseIndex || runState === "complete" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                          <div><b>{title}</b><p>{detail}</p></div>
                        </li>
                      ))}
                    </ol>

                    <div className="assignment-grid">
                      <article>
                        <small>PRIMARY CONTRIBUTOR</small>
                        <b>Own the structure and implementation path.</b>
                      </article>
                      <article>
                        <small>CRITICAL REVIEWER</small>
                        <b>Stress-test claims, gaps, and product clarity.</b>
                      </article>
                    </div>
                  </>
                ) : (
                  <div className="direct-run">
                    <span>Selected provider</span>
                    <p>{runState === "complete" ? "The prewritten direct response is ready below." : "Showing how one selected model prepares a concise response."}</p>
                  </div>
                )}

                {runState === "complete" && (
                  <div className="resolved-card">
                    <span>FINAL RESULT</span>
                    <p>{example.result}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="composer-mock">
            <div className="composer-copy">
              <span>{example.prompt}</span>
              <small>{mode === "Rivune" ? "Rivune · 2 compatible CLIs" : "Selected provider · account default"}</small>
            </div>
            <button
              className={isRunning ? "is-running" : ""}
              type="button"
              aria-label={isRunning ? "Stop demonstration" : "Play demonstration"}
              onClick={isRunning ? stop : play}
            >
              {isRunning ? <span className="stop-icon" /> : <span className="play-icon" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
