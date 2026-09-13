# First-launch copy handoff

These strings use the reviewed V6 language and are recommendations for the frontend owner. They are not applied to runtime or frontend source by this package.

| State | Recommended user-facing copy |
|---|---|
| Loading | **Checking this device…** Keep message entry and Send disabled until the first workspace check succeeds. |
| Empty workspace | **Start a conversation to begin.** New conversation is the primary next action. |
| No provider | **Choose an AI provider to send messages.** Do not label this state connected. |
| Invalid path | **Choose the full path to a supported provider app or command.** Keep the entered value available for correction. |
| Save failure | **We couldn’t save this draft. Your text is still here. Keep this window open and try again.** |
| Retry admitted | **Retry started with the original request.** Show the replacement task as queued or running. |
| Cancel accepted | **Task stopped.** Show cancelled as the final task state and remove Stop. |
| Import preview | **Review before importing.** Show selected sources, counts, warnings, skipped records, and the destination; use **Import** only after explicit confirmation. |
| Unsupported Council/Swarm record | **This team workflow is not available in this build. Your imported conversation is preserved for review and will not run.** |

Use the approved galaxy direction owned by the frontend task. Status text must remain readable against the dark surface, keyboard focus must remain visible, and warnings must be announced through the existing status region. Fixtures and fixture adapters must always be marked synthetic and must never appear as a connected production provider.

