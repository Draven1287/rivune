# Lantern Pages: design and result presentation correction

The user rejected both the generated website and the way Rivune delivered it. The original output is a failed product acceptance result even though many mechanical checks passed. Preserve it as the baseline at `qa-artifacts/together-website-20260906`.

## Observed problems

The baseline hero spends most of the viewport on a large heading, an empty geometric field, and two buttons. The rest is a sequence of plain text sections and repeated reading cards. It has no strong visual subject or original book artwork. The initial test brief explicitly prohibited images and constrained the combined files to 15 KB; that brief contributed to the weak result.

Rivune's main answer passes the entire final file manifest to its Markdown renderer. This exposes JSON escaping and complete file contents as the primary answer. Preview and save are disconnected from that answer, inside a project window reached through a separate menu. The old project view also selects `store.turns.last`, so simply adding a button without binding the selected turn could show or apply the wrong result.

The original native preview stayed blank; the native implementation task has identified a WebKit rule compilation failure and is verifying its correction. The old collaboration also duplicated complete websites instead of following file ownership and truncated intermediate artifacts. These are separate defects; a successful build alone does not establish the user's requested quality.

## Required user experience

1. A completed website response shows a short readable summary and a clearly named artifact with its file count. A visible Preview action opens the rendered proposed website without requiring a user to find a project menu or understand a JSON format.
2. Files are individually named and inspectable. Saving to a chosen folder uses the existing change review and conflict detection. Raw machine output remains accessible without occupying the main answer.
3. Preview, files, save, copy, and share belong to the exact selected turn. An older result remains accessible after another turn completes. Preview staging does not overwrite the user's project.
4. Contribution and review details remain accessible as the collaboration record. The final answer explains what was actually produced; it does not repeat every partner message or invent a test pass.
5. Loading and errors are visible and actionable. A malformed or incomplete artifact is reported as incomplete, not silently presented as a finished website. Regular prose and ordinary code answers continue to render normally.

## Real rerun

Use `qa-artifacts/together-website-20260906-v2/brief.txt` with the fixed app and a separate empty project folder. Let the actual providers produce and integrate the files. Do not manually replace the generated code and describe it as a Together result. Capture the installed version, source receipt, selected providers, raw complete phase outputs, final manifest, and written-file hashes.

Visually assess the first screen, next-meeting feature, book artwork, section rhythm, typography, and mobile adaptation. A repeated-card template or a lightly restyled copy of the baseline fails even if it has no overflow. Keep the final judgment open until the actual result is rendered and the user can inspect it.

Verify the generated preview inside Rivune and independently in a browser at 1280px and 390px. Check section navigation, keyboard skip/focus, FAQ operation, content visibility, horizontal overflow, and local-only assets. Distinguish structural checks from actual browser interaction checks. Reopen the conversation and its exact artifact to confirm the result survives navigation.

## Ownership

- Update Rivune product direction: collaboration payload/ownership, native preview, first-class artifact result and turn binding, identified tested review build.
- Audit Rivune native app: stronger design brief, independent real app run, artifact and visual acceptance evidence.
- Review and update website daily: the separate Rivune download site. Do not use Lantern as an approved example or claim its quality is verified.

No public installer or launch claim follows from these local corrections. The user has not yet enrolled in the Apple Developer Program.
