# R6 initial native checkpoint

Exact sealed tree b238238b26ecaf52b168a163a9865a910675c4b49fd77c1024a0c1715f4ea6e3 and executable 5216c781682c058ff4b0a92b03aad24a4aab84ff9bcd6b121db8f695297f593f independently matched before launch.

- One direct executable launch: PID80468, `/private/tmp/rivune-r6-seal-001/Rivune.app/Contents/MacOS/rivune`.
- Fresh explicit profile `/private/tmp/rivune-r6-native-amqx91fd/profile`; launch receipt and empty startup log in its parent. Profile lock and snapshots directory were created with private permissions.
- Exact-path CUA selection succeeded; subsequent selection after resetting the JS session to recover API documentation also succeeded. No timeout retries or additional launches.
- Native AX exposes close, full-screen, minimize and menu bar. These controls have not yet been exercised.
- Native screenshots show the Rivune galaxy workspace, bottom local-workspace/settings control, and settings embedded inside the same app window.
- General settings opens and closes. Draft `R6 isolated draft test.` survives this navigation visibly.
- Fresh unconfigured workspace disables Send and explains that an AI provider must be chosen. Cloud accounts and sync are explicitly described as not connected.

Input-tool anomalies: `typeText` produced a truncated draft; `paste` inserted unexpected preexisting clipboard text rather than the requested fixture. No Send was clicked and no provider was configured. The draft was replaced with the known fixture using AX `setValue`, which worked. Do not infer a product typing defect or use clipboard paste for subsequent checks without isolation of the tool behavior.

This is partial actual native evidence. Restart, export, project workflows, native progress/failure/retry, actual provider fixture routing, retained-member cancellation/reopen, accessibility breadth, and responsive/window-control behavior remain unverified. No live providers, installed app changes, old-M4 changes, signing, or source edits.
