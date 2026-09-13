# Swift storage to Tauri — source audit and synthetic fixtures

This is a read-only source audit and fixture package, not an executed migration. No installed app, real history, preferences, project file, credential store or provider account was opened or changed. SOURCE_INVENTORY.json records the eight source hashes and literal storage references read after reboot. The current Store hash differs from accepted0725; this inventory is not proof that the entire current source matches the installed bundle.

## Verified source contracts

| Area | Source contract | Migration requirement |
|---|---|---|
| History | RivuneStore.swift RivuneHistoryStorage; Application Support/Rivune/conversations.json, conversations.backup.json; legacy Alloy paths | Preserve primary and backup bytes independently. Select source explicitly; do not silently merge conflicting copies or overwrite corruption. |
| Conversations | Models.swift Conversation/ChatTurn/AIAnswer | Preserve UUIDs, ordering, prompt/answer text, provenance, favorite/archive flags, projectID, attachments, errors, execution state and optional collaboration records. Raw modes include Together, ChatGPT, Claude, Council and Swarm. Display names must not rewrite saved raw modes. |
| Dates | Default JSONEncoder/JSONDecoder at history/project persistence sites | Legacy numeric dates use Foundation's 2001 reference epoch. Do not interpret them as Unix seconds or milliseconds. The fixture includes an explicit expected Unix millisecond value. |
| Drafts | Private WorkspaceDraftState/ComposerDraft; workspace-drafts.json | Dictionary keyed by conversation UUID strings, plus `new`; selectedConversationID optional. Preserve exact text, attachments and selected artifact. Orphans need recovery, not reassignment to the current conversation. |
| Projects | ProjectWorkspace.swift RivuneProjectStorage.Document, schemaVersion 1; projects.json | Preserve project UUIDs, instructions, dates, archive/default mode, and per-file metadata. Reject future schema versions without modifying inputs. |
| Project permissions | RivuneProjectFile stores path, optional Data bookmark, fingerprint, byteCount, included | A macOS security-scoped bookmark is not a portable path grant. Keep metadata and mark files for reauthorization where the new host cannot validate permission. Do not dereference paths during import. |
| Team/run records | team-configuration.json; coordinator workspace-runs.json | Preserve source receipts and IDs; imported running work must not automatically resume or redispatch. Runtime owner must finish schema-specific reconciliation before exposing execution. |
| Preferences | Current rivune namespace, legacy alloy namespace; source allowlist | Current values win. Preserve recognized appearance/model preferences; validate availability again. Retain unknown fields in recovery metadata. Legacy sharing consent is not authority for a new host's changed routing. |
| Credential references | Models.AISecretReference; BrandMigration bridge service IDs; RivuneAccount KeychainLocalStorage service pattern | References are metadata, not secrets. Never export secret values into JSON, renderer state or logs. Provider CLI readiness and account sign-in remain unverified until the new host checks them through supported adapters. |

The bridge keychain service strings are `com.aaravshah.rivune.bridge` and legacy `com.aaravshah.alloy.bridge`. The account client derives `app.rivune.account.<configured-host>`. These are source literals/patterns, not inspected credential entries. No real host or account secret was read.

## Compatible import approach

The sole Tauri runtime owner defines the destination schema/API. The renderer should request a host-owned import preview; it should not parse unrestricted user filesystem paths or supply permission/credential snapshots as authority. Read explicitly selected legacy source files without writing them. Record input hashes and a compatibility report. Preserve unknown optional records as opaque source data until supported. A committed import should write one new Tauri transaction/store only after explicit selection, with a durable import ID so repetition cannot duplicate conversations or dispatch work. Keep a reversible source backup and distinguish imported display data from executable task state.

Do not call `import successful` while projects, drafts or selected files were omitted. Unsupported records must be counted and recoverable. Active/uncertain runs require reconciliation, never automatic provider dispatch. Existing credentials require a separate host credential-broker decision; they are not part of a portable JSON export.

## Fixtures and remaining acceptance

FIXTURE_INDEX.json lists twelve synthetic envelopes. They cover linked conversations/projects, Foundation timestamps, several drafts plus a new conversation, legacy optional fields, orphan drafts, malformed/truncated draft storage, unsupported project schemas, stale sharing consent, reference-only credentials, unknown explicit retry snapshots and corrupt primary history with a valid backup.

These fixtures were derived from the inspected source. JSON construction is verified; actual native Codable decoding and Tauri import execution have not been run. The runtime owner must exercise them through the real read-only import preview and destination transaction before acceptance. No placeholder bookmark is usable and no fixture points at a real user's file.

Additional runtime cases: interrupted import with atomic rollback; repeated import deduplicates by source/import identity; destination ID collision preserves both originals for review; attachments and selected artifacts retain bytes/source binding; all provider progress and final replacements retain admitted retry context; unknown Council/Swarm records remain inspectable without inventing an execution plan. Retry specifics are in ../retry-context-persistence-20260907/TAURI_PORT_REQUIREMENTS.md.

The Tauri candidate3 renderer's current minimal snapshot contract covers only conversations and runs. It does not yet prove migration support for projects, settings, drafts, credential references or retry context. Do not use its parser success as an import acceptance test.
