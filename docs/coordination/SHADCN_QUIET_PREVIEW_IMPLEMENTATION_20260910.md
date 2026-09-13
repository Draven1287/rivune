# shadcn Quiet Conversation working preview — 2026-09-10

Preview: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=quiet-workspace&preview=1

Delivered bounded synthetic working preview, pending independent review and user visual feedback. Quiet appearance is opt-in in the mounted renderer; default App entry remains current. No native build, launch, provider call or external design submission.

## Implementation

Quiet sidebar and centered conversation, peripheral galaxy, compact composer, Radix dropdown, shadcn button and dialog source, on-demand existing result pane. Native settings dialog adapter deliberately retains browser modality and existing ProviderSetup lifetime. It is not a claim that settings now uses Radix modality. Mode changes open the existing staged configuration flow; no hidden save/send is introduced.

Exact source files:
- `prototypes/ai-native-workspace/THIRD_PARTY_NOTICES.md`
- `prototypes/ai-native-workspace/package-lock.json`
- `prototypes/ai-native-workspace/package.json`
- `prototypes/ai-native-workspace/src/components/ui/button.tsx`
- `prototypes/ai-native-workspace/src/components/ui/dialog.tsx`
- `prototypes/ai-native-workspace/src/components/ui/dropdown-menu.tsx`
- `prototypes/ai-native-workspace/src/host/ComposerExecutionControl.tsx`
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`
- `prototypes/ai-native-workspace/src/host/quiet-workspace.css`
- `prototypes/ai-native-workspace/src/lib/utils.ts`
- `prototypes/ai-native-workspace/tests/hostRenderer.test.tsx`
- `prototypes/ai-native-workspace/tests/rendererScenarios.ts`
- `prototypes/ai-native-workspace/vite.config.ts`

New exact dependency versions:
- `@radix-ui/react-dialog`: 1.1.23
- `@radix-ui/react-dropdown-menu`: 2.1.24
- `@radix-ui/react-slot`: 1.3.3
- `class-variance-authority`: 0.7.1
- `clsx`: 2.1.1
- `lucide-react`: 1.44.0
- `tailwind-merge`: 3.6.0

Official shadcn new-york registry JSON and MIT license retained in qa-artifacts/shadcn-quiet-preview-20260910; attribution in THIRD_PARTY_NOTICES.md. Installed with ignore-scripts into isolated evidence dependencies directory; live node_modules symlink points there. Shared website/candidate dependencies untouched. Vite React dedupe prevents two React runtimes through symlink resolution. Sole owned 4317 server was restored after verifying absence; no competing listener was started.

## Validation

- Frontend typecheck and production build pass.
- 62 preserved controller, scenario and desktop build tests pass (preserved-tests.log).
- Four mounted cases pass at desktop 1487, 390 and 320: new/open/save/send to visible synthetic answer; rejected save retains draft and blocks send; settings close focus/draft; result inspection identity and draft retention.
- Browser keyboard menu ArrowDown/Return focuses Execution mode; Escape closes editor and returns trigger. Native Settings Escape returns Settings focus.
- No horizontal document overflow at 320/390. Screenshots: preview-desktop.png, preview-390.png, preview-320.png, configuration-desktop.png, settings-desktop.png, results-desktop.png.
- Candidate manifest comparison: all 148 accepted source files unchanged, preservation.json. Host controller, contracts, lifecycle and existing App/startup source match before hashes. No native artifact was written.

## Corrections

Synthetic fixture originally supplied null lead identity and a made-up artifact filename, both rejected by existing contracts. Fixed fixture, retained strict contracts. Result inspection now returns exact response fields. Synthetic submit retains admitted team/provider identity. Settings focus assertion now waits for documented animation-frame restoration. Compact editor no longer clips inside composer; focus is moved into its form.

## Limits and review

See prototypes/ai-native-workspace/design-qa.md for side-by-side reference comparison and classified intentional differences: smaller working layout, existing icon, plain-text answers and evidence detail instead of invented participant completion cards. Not final visual approval. No real provider/clipboard/native end-to-end acceptance. Interactive test harness console includes historical fixture failures and act warnings; no clean-console claim. Current Vite8.0.13 has a pre-existing Windows dev-server advisory (audit fix8.3.0); no new dependency advisories found and no unrelated upgrade performed.

Claude Design connector search returned none. Synthetic-only handoff is prepared at qa-artifacts/shadcn-quiet-preview-20260910/CLAUDE_DESIGN_HANDOFF.md; existing access remains unverified. No signup, billing, source/private draft upload or external submission.
