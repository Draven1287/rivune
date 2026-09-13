# Chat-first browser revision

Owner: Rivune App builder. Authority: docs/RIVUNE_DESIGN_DIRECTION.md. Existing frontend at prototypes/ai-native-workspace; existing server http://127.0.0.1:4317 reused.

Implemented conversation-first layout with optional adjacent file/editor/artifact panel, collapsible existing activity shelf, projects/conversation navigation, anchored settings, existing galaxy artwork surrounding quiet reading surfaces. Colors/typography/background treatment remain design proposals. Constellation and artifact output remain visibly synthetic.

Conversation creation and switching preserve messages in memory, drafts in session storage and scroll intent during navigation. Switching cancels local streaming and invalidates callbacks. Settings expose galaxy and larger text, with native modal focus handling. Existing editor/diff, slash commands, typed artifact/agent state and reduced-motion CSS retained.

Verification: npm run build passed (TypeScript and Vite). CUA rendered default desktop 1117px, 390x844 and 320x740. Checked artifact open/close, signed/textual diff additions and deletions, keyboard resize value 51 to 53, conversation switching restoring draft, slash keyboard selection, local stream completion and explicit early cancellation, mobile navigation, settings larger text toggle and Escape returning focus to Settings, activity shelf open/close. Temporary viewport override reset. One preview left open with editor/shelf closed.

Limits: no connected AI, provider/host calls, terminal execution or filesystem edits through UI. Conversations disappear on reload; tab drafts remain. No desktop builds, launches, installs, signing, cleanup, paid calls, publication or schedule changes performed. Full host integration and product acceptance remain outstanding after visual review.
