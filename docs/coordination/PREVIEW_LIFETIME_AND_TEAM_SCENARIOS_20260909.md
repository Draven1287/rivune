# Preview lifetime and selected team-form checks

Completed source/browser batch; no native operations, provider calls, N5 retry, or private evidence forwarding.

## One owned preview

The previous listener was PID 1795, a Vite child of npm PID 1780, itself attached to the tool execution host. Earlier connection-refused reports did not preserve an exit signal/log proving their exact cause. Session-bound process lifetime was the identified avoidable dependency; it is not evidence of an app rendering failure.

Replaced only that verified workspace listener with detached Vite PID **21512**, parent PID **1**. It binds only `127.0.0.1:4317`, uses `--strictPort`, `/dev/null` input, and a file-backed log. No terminal/PTY or unread output pipe is required to keep it running. It survived separate calls and a repeated start kept the same PID. The process is deliberately left running for independent review. This does not guarantee survival across host shutdown, reboot, system termination, or a Vite crash, and installs no login/global startup service.

From the repository root, use:

```sh
python3 prototypes/ai-native-workspace/scripts/preview.py start
python3 prototypes/ai-native-workspace/scripts/preview.py status
python3 prototypes/ai-native-workspace/scripts/preview.py stop
```

Owner: RIVUNE APP BUILDER. State/PID/command/log records: `qa-artifacts/local-preview-4317/process.json`; output: `qa-artifacts/local-preview-4317/vite.log`. Start is idempotent for the recorded matching process. A file lock serializes management commands. An occupied port with no matching owned PID is refused rather than killed or moved to another port. Stop validates the recorded PID command before signalling it. Run commands with the environment's local-process/network permission when required.

Root and populated fixture returned **HTTP 200 in actual browser Network.responseReceived records**, and both rendered. The manager also received HTTP 200 for root, original populated fixture, and filtered populated fixture. `browser-verification.json` records the observed statuses and checks.

## Safe selected checks

Review URL: `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=team-form&preview=1&team=1`.

This runs exactly five fake-host form checks, then leaves the populated mock workspace mounted. It does not run the unrelated submit/cancel/shutdown/mode/recovery scenarios. Each selected test additionally asserts no submission or shutdown method was called. Existing default behavior remains the full suite, now with these five checks added.

For test results without the retained preview, omit `preview=1&team=1`. For one scenario, replace `team-form` with an exact supported value:

| Selector | Check |
| --- | --- |
| `team-pristine` | Same-conversation refresh loads the saved team into pristine controls |
| `team-dirty` | Refresh retains local choices and blocks an unresolved overwrite |
| `team-keep` | Keep my team choices does not save; explicit Save uses the refreshed revision |
| `team-save-ack` | Acknowledged save makes a subsequent external refresh pristine |
| `team-save-failed` | Rejected save retains local choices and leaves the durable team unchanged |

Unknown, empty, or repeated `scenario` values report an error and run zero tests; they never fall back to the full suite. The preview badge explicitly identifies selected scope. The default URL without `scenario` still runs every existing test.

## Verification

- 105 unit tests passed, zero failed/skipped; three new selector-boundary checks included.
- Actual browser: selected group 5/5; individual failed-save case 1/1; invalid selector displayed zero-tests-run error; full suite 28/28; filtered populated badge confirmed 5 selected checks.
- Production frontend build and scoped diff check passed. No production UI or host capability changes were needed.
- An initial new assertion expected a raw fixture error. The controller deliberately shows its durable-save failure message; the test was corrected to assert that actual failure state, without weakening preservation/count assertions.

Only the builder row in LIVE_DISPATCH_STATE.md was updated. Other agents were not dispatched. Native and real-provider acceptance boundaries from the previous receipt remain unchanged.
