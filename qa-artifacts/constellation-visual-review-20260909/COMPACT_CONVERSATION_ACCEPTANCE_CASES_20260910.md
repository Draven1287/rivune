# Compact Tauri conversation list — acceptance baseline

Read NEXT_PRODUCT_SLICES_20260910.md slice2 and APP_POLISH_2026_09_06.md. Current HostWorkspace directly maps all snapshot conversations; there is no compact-list receipt/selected fixture yet. This is acceptance preparation, not a defect report against unfinished implementation or a rendered pass. No browser/server/native/provider actions or app edits.

Existing navigation: row action calls controller.openConversation; controller saves a dirty previous draft before host open+refresh. UI hides mobile Conversations and focuses Message only after successful action. Preserve those success/failure boundaries. Filtering/collapsing itself must not invoke that action.

| Case | Expected evidence |
|---|---|
|0 conversations|Empty state without phantom row or selected ID; no unusable Show all; New conversation remains discoverable under existing admission rules.|
|1 conversation|One compact row with full accessible title and current indication; no duplicates or unnecessary expansion control.|
|8 conversations|Exactly8 default rows, deterministic recency ordering, no overflow-driven inaccessible actions.|
|9+ conversations|Default at most8 rows; Show all exposes every saved item once; collapse restores compact count without deleting/reordering host data.|
|Active outside recent8|Keep active visible without duplicating it or exceeding8 default rows; e.g.7 recent plus active is a valid implementation. Do not silently switch active to newest.|
|Full-list title search|Query matching only item9+ finds it while collapsed; case/whitespace behavior consistent with implemented policy; duplicate titles retain distinct IDs. Clearing search restores prior compact/expanded state predictably.|
|No match|Explicit no-results feedback and reachable clear/search control; retain active selection, draft and transcript. Active may remain as separately identified current context; must not misleadingly appear as a search match.|
|Collapse after older selection|Active older row remains visible/current; no open/save/provider call on collapse. Focus stays on the surviving toggle or deliberate visible target, never lost through removal of focused content.|
|Filtering focus|Typing retains search focus/caret; no auto-open; clearing/changing query preserves selection/draft/transcript scroll. Show-all/collapse doesn't remount chat unnecessarily.|
|Long titles|Single compact visually truncated row; complete title available accessibly and by practical discovery; long unbroken and Unicode titles cannot widen sidebar or cover controls at320/390px.|
|Keyboard|Search, show-all/collapse and rows reachable with visible focus; Enter/Space activates buttons once; active indication independent of color; removed rows do not strand focus.|
|Navigation with dirty draft|Successful switch uses existing save-before-open and returns mobile view/focus to Chat/Message. Failed save/open preserves previous draft/selection and useful error; search cannot bypass locks/pending restrictions.|
|Desktop/mobile|1440×900,390×844,320×568: compact rows and settings/new/search controls reachable; mobile selected result returns to Chat without overlaying composer. Filtering alone must not switch panes.|

Minimum selected synthetic fixture: configurable0/1/8/12 snapshots; stable IDs and recency data with active oldest; a unique match beyond8, duplicate titles, long title; retained dirty draft and long transcript with measurable scroll; instrumented fake host counters and controllable failed save/open. Import actual list+host wiring and current global stylesheet, advertise exact source hashes, exclude provider/shutdown/unfiltered harness. Component-only tests establish projection; host fixture is needed for draft/scroll/navigation preservation. No speculative branding changes requested.

Baseline SHA256 (changing builder workspace, not a freeze):
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`: `c746dc94c32a7f65768fcf42cd61c5a91726fd60e9f3a79f77c3bde445528ff4`
- `prototypes/ai-native-workspace/src/host/workspaceController.ts`: `f4f0a37cf47bc1b04561777f1ecfd5a4ba5fd007b8625f3d1eebf0f2148b9489`
