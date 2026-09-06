# Security policy

## Supported versions

Until Rivune has tagged stable releases, security fixes are applied to the
current default branch on a best-effort basis. Old commits, unofficial binaries,
and modified forks are not supported by this repository's maintainers.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Draven1287/rivune/security/advisories/new)
to report a security issue privately to the maintainers. Do not open a public
issue for an undisclosed vulnerability.

Do not post vulnerability details, credentials or private data in public issues.
Reports should include the affected version and platform, impact, and a minimal
reproduction with private data removed. This volunteer project does not promise
a response SLA. Maintainers will acknowledge and coordinate disclosure as
capacity allows.

## Never send credentials

The project will never ask you to post or send provider passwords, API keys,
session cookies, Keychain exports, signing certificates, pairing QR codes,
temporary pairing codes, reconnect credentials, or private prompts and
attachments. Redact secrets and personal data from screenshots, diagnostics,
logs, crash reports, and sample projects.

Current CLI integrations use each provider's normal local sign-in flow. Any
future API connector must keep credentials outside source control and test
fixtures, use an OS credential store or an explicitly local environment, and
prevent credential values from appearing in logs or error messages.

If a credential is committed or shared, revoke or rotate it at the provider
immediately. Removing it from the latest commit is not sufficient because Git
history and forks may retain it.

## Security boundaries worth reporting

Reports are especially useful when they involve:

- Unexpected command or tool execution, shell injection, or bypass of fixed
  executable and argument controls.
- Reading or writing files beyond the documented provider-client behavior.
- Leakage of prompts, attachments, conversation history, credentials, or
  Keychain material.
- Pairing, authentication, transport, replay, message-size, or local-network
  authorization flaws.
- Unsafe persistence, logging, cancellation, timeout, or process-descendant
  behavior.
- A misleading UI state that could cause a user to share data with a provider
  without informed consent.

Rivune's provider-process restrictions are defense in depth, not an OS-hard
sandbox. The Mac-to-iPhone bridge is intended for deliberately paired devices
on the same local network. Reports should evaluate behavior against these
documented boundaries without assuming that compatibility references imply a
security guarantee from a third-party provider.

## Independence

Rivune is an independent open-source project and is not affiliated with or
endorsed by OpenAI, Anthropic, Apple, Tesla, or other referenced providers and
platforms. Third-party product names and marks belong to their respective
owners.
