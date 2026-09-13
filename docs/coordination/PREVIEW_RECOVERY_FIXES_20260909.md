# Preview recovery and accessibility fixes

Same prototypes/ai-native-workspace source and existing 4317 server. No host/provider/desktop actions.

- Narrow artifact opening focuses the visible close control; closing returns to visible opener or chat header fallback. Conversation selection/creation focuses composer.
- Cancellation marks working and waiting agents/steps cancelled, preserves completed steps, removes unfinished artifact links, and invalidates timers. Inactive navigation no longer cancels a static fixture.
- Versioned sessionStorage rivune-conversations-v1 restores IDs, selection, messages, agents and steps, with draft keys retained. Recoverable orphan drafts appear with empty history; no conversation history invented. Per-send UUIDs avoid reload ID collisions. Interrupted reloads become cancelled.
- Validates stored shape/size and unique IDs. Malformed/unavailable storage remains untouched with usable memory fallback and visible notice. Session storage is not desktop persistence or sync. Settings reflects these limits.
- Result cards use explicit message artifact IDs, resolve associated file, and omit unassociated/cancelled cards.
- Short viewport treatment yields 269.5px transcript at 320x568, measured in rendered browser with shelf closed.

Verification: final npm run build passed including TypeScript and all CSS. CUA 390px artifact opening focused Close artifact panel. Early stop showed four cancelled steps. New conversation → unsent draft → switch → reload → return restored exact draft; completed response and sample artifact survived reload; subsequent cancelled request after reload retained both earlier completed output and stopped text after another reload, without an unrelated cancelled artifact. Independent parity reviewer also passed README-switch-close-result regression. Focused agent-run mocked storage checks passed malformed JSON/version/duplicate IDs/wrong types/oversize/unavailable storage, orphan recovery and interrupted reload. No browser malformed-storage mutation was performed.

Still pending: connected providers, actual execution, durable desktop history, cross-device recovery, configurable Constellation, broad visual approval and full contrast audit. Product-coherence/host findings remain integration backlog.
