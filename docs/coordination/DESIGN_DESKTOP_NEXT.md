# Desktop chrome — next builder integration

Specification proposal, not rendered approval. Sole production/native/preview owner: RIVUNE APP BUILDER. No native/computer-control operations, production edits or paid tool use. Design-handoff skill used to turn current-source observations into bounded dimensions and interaction requirements.

## Current source anchors

Visually inspected `prototypes/ai-native-workspace/src/assets/rivune-icon-128.png`: silver R with blue/silver orbit on dark galaxy. Preserve this direction; do not replace with a generic letter, old V/Y or new logo. HostWorkspace.tsx imports this asset, renders brand link to #host-chat plus wordmark in app-header, and displays recovery mark at 40px. The selected asset's full galaxy tile is not a monochrome menu-bar template.

styles.css .host-layout uses a fixed 240px sidebar and 12px gutters. Below 700px host sidebar becomes a separate view. ResizableLayout.tsx is the browser demo: defaults 224px, clamps 184–300px, keyboard arrows/Home/End, and writes rivune-demo-layout-v1. Do not assume that component already controls the authoritative host or reuse its demo storage key. Native tauri.conf.json currently retains standard decorations and resizable windows, minimum 760×560. No custom titlebar is necessary for this slice.

## Proposed visual contract

| Element | Builder specification |
| --- | --- |
| App brand | One 28px silver-orbit mark + Rivune wordmark in 48px web header; 12px inset, 8px mark/text gap. Keep image aspect ratio. No duplicate prominent logo inside conversation header. |
| Recovery/loading | Existing 40px recovery mark is acceptable; quiet brand text in static loading is intentional, not a new logo treatment. Avoid making successful boot depend on image loading. |
| System titlebar | Keep native traffic lights and system titlebar now. Short title Rivune, optional current conversation only if privacy-approved; never fake close/minimize/fullscreen web buttons. QA titles remain visibly distinct in QA overrides. |
| Conversation header | Active conversation title, compact real status, Results action. One-line ellipsis for long titles with full accessible name. Do not repeat the brand or present diagnostic prose as primary chrome. |
| Surface hierarchy | Galaxy visible around perimeter/welcome, not behind dense transcript text. Opaque or near-opaque graphite reading/sidebar panels; quiet 1px borders. Reuse accepted calm surface tokens; do not change entire palette during chrome work. |
| Focus/targets | Proposed chrome control hit box 32px minimum desktop, 44px touch. Visible 2px focus ring with 2px offset; validate 3:1 against adjacent surfaces and 4.5:1 normal text. Hover never substitutes for keyboard focus. |

Menu-bar icon: later native owner should derive a dedicated optical-size monochrome silver-orbit silhouette/template from approved identity, with transparent background and verified light/dark visibility. Do not shrink the full galaxy raster to 18px or claim a new icon approved. Application bundle icon retains full artwork. No icon regeneration required for the host-layout change.

## Host sidebar resizing

Implement in HostWorkspace's real layout, using a small presentation-only hook/component; no conversation/controller remount, database or provider operation. Proposed default 240px, minimum 200px, maximum 320px, additionally clamped to preserve at least 420px chat width at narrow desktop sizes. Account for gutters and Results width when computing available space. If Results competes for that minimum, preserve the existing narrow-results mode rather than squeezing transcript/composer.

Use a 6px hit strip with a quiet 1px visible divider; col-resize cursor. Focusable vertical separator, aria-controls actual sidebar ID, aria-valuemin/max/now plus pixel valuetext. Left/Right adjust 12px, Shift+Left/Right 24px, Home minimum, End current effective maximum. Escape during pointer drag restores pre-drag width; pointerup commits, pointercancel/lost capture safely ends drag. Double-click reset is optional convenience, never sole reset path; add accessible Reset sidebar width action if implemented. Do not capture arrow keys globally or intercept composer editing.

During drag use pointer capture and transient layout state; no per-move persistent writes. Start session-only unless a dedicated, versioned host UI-preference boundary is approved. If persisted later, save on commit, clamp invalid/stale values on load, and fail without losing current layout when storage is unavailable. Never use rivune-demo-layout-v1 or store draft/model/team data in layout preferences.

Below the existing 700px web breakpoint, retain sidebar/chat navigation; hide separator from both pointer and tab order. Native 760px minimum does not eliminate browser fixture/mobile accessibility requirements. Collapsing sidebar must not unmount the controller or clear drafts. Restore focus to the toggle when collapsing focused sidebar content; reopening may restore previous sidebar focus only if still present.

## Window and keyboard invariants

Keep native close-to-hide and existing guarded Quit/Dock behavior; design must not turn Close into destructive quit or bypass shutdown. No always-on-top panel. Brand activation should focus the existing chat region without creating a conversation, changing selected team or dispatching; replace hash-only navigation with explicit focus handling if necessary, preserving an accessible link/button name. Do not give a decorative logo an extra tab stop.

Tab sequence follows visible order: brand/chat navigation, sidebar controls/conversations, resize separator, conversation actions, transcript links, composer and its actions. Hidden Results/sidebar controls must not remain focusable. Escape dismisses the topmost dialog/panel and restores its opener; while resizing it cancels drag first. Keep existing Cmd/Ctrl+Enter send semantics untouched and do not add conflicting global shortcuts. All chrome transitions 120ms opacity/color at most; prefers-reduced-motion removes transitions. No animated galaxy/orbit during reading or loading.

Constellation status/results remain derived from the existing host pipeline. No invented working badge, fake agents or Auto capability. Results opens the actual selected conversation's saved outputs. Error/uncertain/durability notices remain visible and accessible, even if routine provider-readiness diagnostics move into existing Settings/diagnostics. Do not hide blockers to make chrome cleaner.

## Smallest acceptance slice

Builder implements only host header spacing/brand focus and host sidebar separator. Verify 760, 1120 and 1280px desktop plus existing 390px web fixture: long titles, keyboard resize endpoints, pointer cancel, viewport clamp, open Results, no overflow, focus restoration, reduced motion. Assert same controller instance, unchanged dirty draft/selection/team, and zero dispatch from resizing/navigation. Native traffic-light/Dock appearance is separately authorized; source/browser checks do not prove it. Claude Design artifacts, if supplied by the user/lead, remain proposals until reconciled with these host-state constraints.
