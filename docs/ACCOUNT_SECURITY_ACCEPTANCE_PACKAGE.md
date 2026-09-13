# Account security acceptance package

Status: proposed implementation-owner test package, 2026-09-06. No production
implementation changed; these cases have not been executed by this reviewer.
Build 2026090606's existing lifecycle tests are acknowledged, not replaced.
P0 gates apply before enabling account services, not to the auth-disabled local app.

## Test harness contract

Use the existing `RivuneAccountBackend` seam in isolated hosted tests. Extend the
test seam where marked below; do not enable production injection. The current fake
returns success for OAuth, email sending, verification, and callbacks, so it cannot
prove protocol ownership or provider rejection behavior.

Required doubles:

- Scripted backend: independently suspend/resolve/reject send, OAuth, exchange,
  user verification, revoke, deletion and export; explicit call counters.
- Manual clock: advance expiry without real sleeps, including clock rollback.
- Event stream with an acknowledgement/barrier after event handling. Avoid tests
  relying on a fixed count of Task.yield() calls.
- Storage spy: separate account, transaction, API-key and pairing namespaces;
  inject denied/read/write/remove failures. Default test transport fails on every
  unexpected external request. No real SDK client or Keychain should be created.
- Durable fake store: recreate controller against the same serialized records at
  named crash points; inject truncated/unknown-version records.
- Fake filesystem/export writer: deny writes, fail for disk-full, resolve symlinks,
  and record exactly which originals are read or changed.
- Unique defaults suite per test, removed in teardown; finish streams and cancel
  observers so one test cannot leave tasks or persisted identity in another.

Use synthetic users A/B with stable IDs and `example.invalid` addresses. Snapshot
and log assertions must reject canaries representing tokens, verifiers, API keys
and pairing secrets. A fake acceptance result proves policy, not real OAuth.

## P0 deterministic cases the owner can add now

Each row is Given → When → Then. Cases requiring a new seam should initially be
tracked as missing coverage, not implemented as a passing placeholder.

| ID | Setup and deterministic action | Required assertions |
|---|---|---|
| K01 | Auth-disabled launch → open Settings, replay startup, foreground, deliver unsolicited callback | Account backend/storage/network creation count stays zero; local work remains usable. |
| K02 | Signed-policy fake allows auth → explicitly initiate sign-in twice | One backend and observer; storage begins only after action; duplicate in-flight request blocked. |
| K03 | Explicit action → storage denies access | No verified identity; actionable cancel/retry; no fallback plaintext store or destructive cleanup. |
| C01 | Email send is suspended → cancel → send returns success | No challenge reappears, no callback accepted for canceled generation; local draft unchanged. New cancellation seam required. |
| C02 | Challenge A → supersede with B → deliver A callback/success | No B identity or challenge mutation; no exchange for unowned A. |
| C03 | Prepared persisted challenge → recreate process → receive link | Callback alone performs zero protected-storage reads; show explicit Continue or honest unsupported-cold-return state. |
| C04 | C03 → user Continues → record matches service/device/expiry/generation | One exchange, followed by server verification; no verified state before both succeed. |
| C05 | Missing/corrupt/expired/canceled/wrong-service record or denied storage → Continue | No exchange; offer new sign-in; preserve unrelated credentials and files. |
| C06 | Same callback delivered twice while exchange suspended | One exchange; second does not reset ownership or open another auth session. |
| C07 | Crash before exchange / after dispatch / after exchange / before identity commit | Reconcile only transaction-attributable result after explicit resume; ambiguous result requires new sign-in, never blind code replay. |
| C08 | Negative/rolled-back time or expired backend code | Fail closed; deadline cannot become indefinitely valid after relaunch. |
| O01 | Google/Apple fake presentation canceled or provider rejects | No verified identity; cancellation is recoverable without scary raw SDK error; late success cannot resurrect canceled attempt. |
| O02 | Wrong/missing/replayed state, nonce or PKCE binding at adapter boundary | SDK/adapter rejection never reaches accepted identity. Test separate protocol adapter, not just a fake no-op oauth(). |
| O03 | Apple returns stable ID but no new name/email; private relay email | Identity uses verified stable ID; optional fields handled; never silently merge by email. |
| S01 | Verified A expires at T → clock advances to T without SDK event | Verified state clears or becomes unverified; no account-authorized work until revalidated. Expiry metadata/clock seam required. |
| S02 | Refresh while send/verify is busy → event acknowledged → operation finishes | Refresh is coalesced/deferred rather than permanently dropped; exactly one necessary recheck after busy state. |
| S03 | User verification offline → explicit retry resolves | Local work preserved; verificationFailed clears only on success; no network retry storm. |
| S04 | SignedOut event → later refresh event with fake old user | Declared revocation policy holds; old event must not silently restore identity. Distinguish SDK event semantics from user-initiated logout. |
| S05 | A verification deferred → explicit logout → resolve old A | Identity remains hidden; signed-out intent remains authoritative. Existing test covers core path. |
| S06 | A operation pending → switch to B → resolve A success/error | Neither A result nor error changes B; account-bound work/export stays bound to original ID/generation. |
| L01 | Sign-out backend throws → recreate controller → retry succeeds | Pending intent survives; retry visible; new sign-in blocked until cleanup succeeds; actual token removal not claimed before confirmation. Existing core test retained. |
| L02 | Deferred sign-out emits signedOut before returning; repeated taps | One sign-out call; busy/pending settle correctly; no stale authenticated action starts between event and completion. |
| L03 | Remove one API key / unpair one device / sign out of Rivune | Only selected namespace touched; never delete official CLI credentials or imply remote provider-account deletion. |
| M01 | A signs out, B signs in to device-local workspace | No silent migration/upload/ownership reassignment; UI explains whether local history is shared; old grants never authorize B. |

### Example scheduling pattern (pseudocode, not compiled Swift)

```text
backend.send.defer()
sendTask = account.sendEmail(A)
await backend.send.started
account.cancelAuthentication()
backend.send.resolveSuccess()
await sendTask
assert account.challenge == nil
assert account.verifiedIdentity == nil
assert account.generation != sendTask.generation
await account.receiveCallback(A.oldCallback)
assert backend.exchange.calls == 0
```

This should expose the current `cancelCode` busy guard's inability to cancel an
in-flight send. Do not claim that current disabled UI offers this recovery.

## Secure cold-return design

Use SDK-owned PKCE/state, never a custom substitute. One pending flow per
service/device in v1. At explicit send, persist a protected record containing
transaction ID, service/environment, exact callback, generation, issued/deadline,
expected identity constraint, SDK verifier/correlation reference and state.
Proposed maximum pending lifetime: ten minutes or shorter configured backend
validity; this is a product choice, not a provider default.

Receiving a URL is not permission to open account Keychain. Validate URL shape,
keep the code only in memory and offer Continue/Cancel. Continue permits reading
the protected record, checking ownership and invoking SDK exchange. An optional
nonsecret pending marker is only a presentation hint. Callback parameters are
untrusted; matching a caller-supplied transaction ID is not authentication.

Bind every async result to generation and expected account. Serialize exchange,
consume success once, and retain bounded nonsecret replay/cancel tombstones.
Cancellation must invalidate immediately even when Keychain cleanup is deferred.
Cold-return recovery may reconcile only a transaction-attributable session; when
uncertain, request a new link. Never copy the verifier to another device. If the
installed SDK cannot provide the required persistence/correlation contract, keep
cold return explicitly unsupported until an adapter is designed and tested.

For Google, retain SDK PKCE/state and system authentication-session cancellation.
For Apple, state/nonce handling depends on the chosen flow: hosted OAuth versus
native identity-token exchange. Use the official adapter's expected nonce/hash
contract, not a universal hand-written nonce transformation. Keep Apple private
keys/provider secrets server-side. Test protocol failures separately from UI.

## Deletion, revocation and full export cases

Account deletion requires a backend, recent reauthentication, scope confirmation,
idempotent request ID and a durable receipt. Identity derives from authenticated
server context, never a client-submitted account ID. No admin key belongs in app.
Block new account writes once deletion is accepted. Revocation/erasure are separate
steps; partial failure remains pending, not complete. Preserve disclosed minimal
receipt/retention records; do not promise immediate removal from backups.

| ID | Given → When | Required result |
|---|---|---|
| D01 | Delete screen → cancel or fail reauthentication | Zero destructive calls or local changes. |
| D02 | Confirmed authenticated A → client submits B ID | Server ignores/rejects supplied identity; B untouched. |
| D03 | Delete request R accepted → timeout/relaunch/retry R | One logical deletion, same receipt; never require a second destructive request with a new ID. |
| D04 | Account disabled, Apple/Google grant revoke fails | Receipt distinguishes identity-disabled, data cleanup and revocation pending; retry only missing step. |
| D05 | Offline deletion → reconnect | No false completion or surprise automatic irreversible submission; explicit retry unless precisely authorized otherwise. |
| D06 | Delete cloud identity, leave local data unchecked | Chats/projects/external files/CLI credentials unchanged; explain local copies and exports remain. |
| D07 | Explicit scoped local erase while result/export is pending | Cancellation/generation/tombstones prevent recreation; preserve external referenced originals. |
| D08 | Deleted account token used on second fake device | Authenticated operations denied; no re-creation through delayed refresh. |
| E01 | Full export request | Manifest includes version, categories, exclusions, as-of times and status for local/server snapshots. |
| E02 | Credential canaries in secure-store namespaces | No tokens, verifiers, API/pairing secrets, private keys or receipt capabilities serialized. User-authored secrets require a warning, not guaranteed redaction. |
| E03 | Referenced files not selected | No read of original contents; explicit opted-in files use bounded safe-path handling. |
| E04 | Cancel/disk-full/denied destination/partial server response | Originals unchanged; atomic write or clearly incomplete artifact, never falsely complete export. |
| E05 | A server export ready after switch to B or deletion | B cannot receive/download A artifact; authorization/generation checked at delivery. |
| E06 | Unsafe archive paths/symlinks | Reject traversal; no arbitrary filesystem access or unsafe archive entry. |

Full export scope must enumerate conversations/attached text, collaboration traces,
project metadata/instructions/membership, drafts, preferences and server-held
profile/data. Existing conversation JSON is not full export. External files are
opt-in; exported files are normally readable unless an actual encrypted format is
implemented. Export checksums indicate integrity, not confidentiality/completeness.

Privacy disclosure must distinguish auth-service identity data, selected content
sent to AI providers, local history/Keychain storage, telemetry (if any), retention,
backup deletion delays, local exports and external provider retention. Removing a
local key is not remote revocation. Deleting Rivune never deletes ChatGPT/Claude
accounts/subscriptions or retracts prompts already sent to them.

## Separate signed-build checklist — NOT RUN

Requires owner-approved test identities, stable signing, configured backend and
action-time approval for any real deletion. Never use production user data.

- Mac: verify exact SDK version and real Google/Apple/email success, canceled
  consent, rejected callback/state, real email template and expired/replayed link.
- Warm/cold return: app quit, device restart, denied/unavailable Keychain, explicit
  Continue, consumed code with lost response, wrong device, stable signed upgrade.
- Lifecycle: actual expiry/refresh, server revocation, foreground, offline/retry,
  local SDK cleanup outcomes and persisted failed-signout recovery.
- Two disposable identities: prevent cross-account server reads, delayed download,
  session mix-up, email-based account merge or implicit local history upload.
- Deletion/export: approved disposable deletion, service records/session/grant
  revocation, signed receipt/pending status, export authorization and expiry.
- Future iPhone: independent signing/entitlements, iOS presentation/callback and
  Keychain accessibility policy, device-locked/background/termination paths,
  explicit pairing and Mac-offline behavior. Mac success does not pass iPhone.
- Public website only needs presentation/download/privacy information and any
  deliberately configured auth-association endpoint, not a browser workspace.

## Evidence and gates

For each ID record source revision, build, platform, fake/signed tier, assertion,
result and redacted evidence. Missing seams are OPEN, fixtures are not live proof.
Require all relevant P0 fake and signed cases before enabling a method publicly.
Leave unsupported iPhone methods disabled. Never use total test counts as a proxy
for this matrix. Local account-disabled review builds may continue shipping for
review without claiming production-account readiness.

## Source-review gaps at creation

In RivuneAccount.swift: no expiry metadata in RivuneVerifiedAccount and no expiry
clock; refreshed events invoke restore which returns while busy (no coalesced
pending recheck); cancelCode refuses while busy; callback guard supports only an
in-process challenge. These are scoped coverage/design gaps, not live exploits.
Previously identified observer-start and signout retry issues have been addressed.

## Protocol references

- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple

Owner must verify the installed SDK and configured provider behavior before
implementing flow-specific assumptions. This package authorizes no credential
use, activation, real sign-in/deletion, publication or shared app-code changes.
