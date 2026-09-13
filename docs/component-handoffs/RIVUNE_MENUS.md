# Rivune menu primitives handoff

September 6, 2026. Extended existing `Rivune/Theme.swift` definitions; no duplicate component, new Xcode entry, app install or native UI operation. The root assigned Theme.swift exclusively; other owners migrate consumers.

## Compatible API

```swift
RivuneMenuAction(
    title: String,
    id: String? = nil,
    systemImage: String? = nil,
    section: String? = nil,
    isEnabled: Bool = true,
    isSelected: Bool = false,
    destructive: Bool = false,
    action: @escaping () -> Void
)

RivuneActionMenu(title: "Project actions", actions: actions) // Existing ellipsis trigger.
RivuneActionMenu(title: "Move conversation", actions: actions) {
    Label("Move", systemImage: "folder") // Custom visible trigger.
}

RivuneSelect(title: "Model", selection: $model, options: [("First", first), ("Second", second)])
// Optional final argument: isOptionEnabled: (Value) -> Bool.
// Existing tuples and optional-valued selections remain supported.

row.rivuneContextActions(title: "Conversation actions", actions: actions)
trigger.rivuneDismissOnFocusLoss(isPresented: $isExpanded)
```

Existing `RivuneMenuAction(title:destructive:action:)` remains valid. `section` supplies a flat group heading; use it for clearly named “Move to project” destinations. Selected rows show a checkmark and accessibility selected trait. Disabled rows cannot be chosen or reached by the arrow cursor. Disabled parent controls cannot open a menu; becoming disabled dismisses an existing menu, propagates disabled state into content and guards activation. Keep the existing operation-level store guards in consumers as well.

## Interaction behavior

Menus use Rivune colors, spacing, text and rows inside SwiftUI's owner-attached popover. There is no native SwiftUI Menu/Picker content, NSPanel, window-level mutation or always-on-top window. Arrow keys cycle through enabled items; Return/Space activate; Escape dismisses; Tab dismisses and lets focus traversal continue. The trigger receives explicit focus restoration only on direct menu dismissal/activation, never from background/window-loss notifications. Accessible labels, row selection traits and a “Show actions” accessibility action are supplied.

On macOS the context modifier has a transparent AppKit hit-test surface that accepts only secondary-click and Control-click. Normal clicks, scrolling and dragging pass through. Keyboard invocation is Shift-F10 or Control-Return when the consumer row already has keyboard focus; the modifier does not add a second focusable row. The popup uses the same content as ellipsis actions. iOS has the accessibility action; this increment does not add a long-press gesture.

## App/window focus bug

Attach `.rivuneDismissOnFocusLoss(isPresented:)` to the **presenting trigger**, not to its popup content. Existing ActionMenu/Select/context-action consumers already include it. Other model/reasoning/account popovers need the modifier added by their source owner.

The binding closes on app deactivation/hiding, inactive scene/disappearance, and the owner window losing main status, minimizing or closing. Owner-key loss is checked after AppKit settles; an attached popup may legitimately become key while its owner remains main, so that transfer is allowed. Losing both owner-main/key or app activation closes the binding. This never calls application activation or key-window promotion and never reopens when the user returns. It is a source-level fix pending real app switching QA, not a claim that every transient panel in the app has already been migrated.

## Validation and required rendered checks

Read-only Swift 6 macOS 26 typecheck passed for the complete Theme.swift plus migration examples covering legacy action construction, custom triggers, selection, disabled/selected/grouped actions, optional selection values and context modifier. SwiftUI macro typechecking required compiler execution outside the nested sandbox; permission was accepted. No UI/app/provider execution occurred.

Main owner should build integrated consumers and inspect:

1. Open ellipsis, select, conversation secondary-click and model popovers; switch to another app and confirm all close immediately without remaining in front. Return to Rivune and confirm none reopen.
2. Open each popup; focus another Rivune window, minimize/close owner, click outside, and press Escape. Clicking inside the popup itself must not immediately dismiss it due to its key-window transfer.
3. Arrow through mixed enabled/disabled items, selected choices and grouped project destinations; use Return/Space; verify Tab/Escape and focus-ring behavior. Empty/all-disabled lists must not invoke an action.
4. Open a control and change the parent busy/disabled state; ensure the popup closes and no action can fire. Store-level authorization/busy guards remain necessary.
5. Verify conversation normal click, scrolling, drag and Control-click/right-click; test focused-row Shift-F10/Control-Return and VoiceOver action names. The exact keyboard/AX behavior still needs rendered validation.

No full application test count, rendered accessibility pass or resolved user-visible focus bug is claimed by this component handoff alone.
