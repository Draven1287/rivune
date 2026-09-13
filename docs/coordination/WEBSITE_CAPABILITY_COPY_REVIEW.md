# Website capability copy review

Reviewed September 9, 2026. Read-only, bounded public-copy review.

## Verdict

No concrete public-readiness or capability inaccuracy established in the reviewed pages. No copy correction is required by this review. This is not approval of a desktop release, provider integration, or pending QA evidence.

## Evidence and scope

Fetched current public HTML from https://draven1287.github.io/rivune/ for `how-it-works/`, `council-vs-swarm/`, `download/`, `faq/`, `contact/`, and `privacy/`. Compared the claims with `docs/RIVUNE_DESIGN_DIRECTION.md` and current source under `prototypes/ai-native-workspace`, particularly `src/App.tsx`, `src/components/chat/ChatPanel.tsx`, `src/components/settings/ConnectionSetup.tsx`, `src/host/Constellation.tsx`, and `src/host/teamConfiguration.ts`.

- Constellation: the public explanations explicitly label the Engine and team workflows as in development. Current source contains host-facing configuration/run presentation and capability gates, while the design preview explicitly identifies simulated conversation and no connected AI. Source implementation does not establish publicly available execution; the site's development qualification remains appropriate.
- Tauri and platforms: download copy explicitly distinguishes the legacy SwiftUI/Xcode source preview from the forthcoming Tauri app. macOS, Windows, and Linux are described as development targets, with no installers available. No verified platform release is claimed.
- FAQ: provider access and charges are separate; connected AI features are described as not ready; offline behavior is unconfirmed. Legacy local history is distinguished from the new desktop app's unfinished storage/routing. No guaranteed AI correctness, delivery date, or production-readiness promise was found.
- Contact: Gmail and copy-email are ways to address a message, not promises of delivery or response. No response-time or automatic follow-up promise appears. Privacy copy explicitly states that forwarding-service delivery is a dependency and that the website has no contact form.
- Privacy: legacy behavior, planned team routing, and verification before release are distinguished. Internal host adapters alone do not warrant changing public copy to claim verified live Tauri integration.

## Limits

No builds, tests, native launches, provider calls, source edits, server changes, deployment, schedules, or cross-task sends were performed. Only this report was written. No supplemental private QA record was accessed. Existing approvals remain pending. This review inspected copy and relevant source; it did not repeat the earlier full-site visual/link audit or verify email delivery, signed installers, or live provider execution.
