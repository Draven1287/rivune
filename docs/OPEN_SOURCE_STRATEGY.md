# Rivune open-source strategy

Rivune should remain one maintainable product, not a private codebase that is
periodically copied into a public fork. The public project owns the reusable
workspace, provider contracts, Rivune mode orchestration, native interface,
security boundaries, and tests. Aarav's personal build supplies only local
configuration and optional private adapters from files that are excluded from
source control.

## Product boundary

### Community core

- Native macOS and iPhone workspace.
- Conversation history, attachments, model and effort controls, and the
  permission-aware composer.
- Provider registry and adapter contracts for CLI and API transports.
- Provider and council contracts for arbitrary Rivune mode participants, with
  explicit planning, assignments, handoffs, peer-review, and final-integration
  roles. The current executable engine remains the two-provider CLI council.
- Mac-to-iPhone relay, deterministic tests, security documentation, and the
  public download site.
- No bundled provider credentials, sessions, private prompts, or account data.

### Personal configuration

- Enabled providers, preferred models, model aliases, and default Rivune mode
  teams.
- API-key references stored in Keychain or environment-variable names; never
  raw secret values in configuration models.
- Experimental adapters that cannot yet meet the public adapter contract.
- Local signing identity, development-team settings, and unpublished release
  notes.

Personal configuration belongs in Keychain and ignored local files such as
`Local.xcconfig`. It must not require modifying community source files.

## What makes Rivune different

Provider count is not the differentiator. Rivune mode is. A provider adapter
declares what it can do, but the orchestrator decides how a team collaborates:

1. Produce and challenge a shared plan.
2. Give each participant a complementary assignment with visible handoffs.
3. Execute independent work while preserving shared context.
4. Have every reviewer inspect the complete set of contributions, including its
   own work and a concrete element from each peer's work.
5. Require explicit conflict findings and actionable resolutions from each
   independent review.
6. Integrate one deliverable while retaining the inspectable source work.

The same workflow must support two participants or many. A model can be a
planner, contributor, reviewer, resolver, or a combination when its adapter
declares the necessary capabilities.

## Provider trust boundary

Every adapter must state:

- Transport: local CLI or HTTPS API.
- Executable path or API base URL owned by the adapter, never interpolated from
  a prompt.
- Available models, reasoning levels, context limits, attachment support,
  streaming, cancellation, and tool behavior.
- Authentication reference without exposing the credential value.
- Data destination and the permissions the user granted for the current run.

An adapter is configuration-only until it implements execution, cancellation,
bounded output, error normalization, and a provider-specific privacy
disclosure. The interface must not show a configuration-only adapter as ready.

Discovery follows the same boundary. Rivune searches only exact executable
names declared by catalog entries and only inside its bounded list of trusted
macOS installation directories. It resolves an installed path for display but
does not launch the process. A third-party CLI may therefore appear as
**Installed · Adapter needed** while remaining impossible to execute through
Rivune until reviewed adapter code is present.

## Release gates

A public preview is ready when:

- The macOS app and iOS Simulator build from a clean checkout.
- Deterministic tests pass without provider accounts.
- A redacted live test passes for every advertised executable adapter.
- The source archive contains no credentials, user history, local signing
  material, build output, or machine-specific Xcode state.
- The download includes a SHA-256 checksum and clear preview limitations.
- A tagged GitHub release replaces the temporary website-hosted source archive.
- A macOS binary is Developer ID signed and notarized before it is advertised
  as a normal public end-user download. Until then, ad-hoc packaging is local
  QA only and is never offered by the website; the source archive remains the
  ordinary inspectable distribution.

## Release progression

1. **Architecture preview:** provider registry, safe CLI discovery, and native
   catalog-driven Settings UI exist; current Codex and Claude CLI adapters
   remain the only executable providers.
2. **Adapter preview:** publish the adapter protocol and add one reference API
   adapter with Keychain-backed authentication.
3. **Team preview:** allow any enabled executable adapters to be assigned to an
   arbitrary Rivune mode team.
4. **Public beta:** tag the repository, publish signed source artifacts, and
   run cross-provider privacy and cancellation tests.
5. **End-user release:** distribute signed and notarized macOS builds and verify
   the iPhone relay on physical hardware.

The website must label the current stage accurately. It should never imply
that an API connector, arbitrary provider, signed binary, or App Store build is
available before that capability passes its release gate.

## License and future managed cloud

The owned client and local runtime, including the collaboration algorithm,
provider adapters, permission controls, local history/projects, public wire
contracts and tests, remain Apache-2.0. Local CLI/BYOK use must not depend on
an official Rivune Cloud account. Existing Apache grants are not withdrawn.

A future managed Rivune Cloud service may have separately licensed hosted
execution, tenant administration, billing, managed sync, abuse controls and
operational infrastructure. This is a proposed service boundary, not a shipped
service or a change to the license of existing code. Public client contracts
remain inspectable. Service authorization must be enforced by the server;
client signatures, public keys and an unmodified UI do not grant tenant access.

Forks must configure their own account backend, OAuth registrations, bundle ID,
callback scheme, credential namespaces, signing identity and update feed before
activating those features. The current account adapter specifically supports
Supabase hosted authentication and a fixed Rivune callback; it is not yet a
generic self-hosted authentication protocol. Exported configuration is disabled
and contains no official backend values. Changing fork identity must retain
exact redirect validation, PKCE and transaction binding.

See TRADEMARKS.md and THIRD_PARTY_NOTICES.md for branding and dependencies.
Public release remains blocked on a verified private reporting destination and
clean extracted-source validation. Planning notes and local review records are
not included in the prepared public repository.
