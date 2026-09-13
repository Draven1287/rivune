# Provider CLI compatibility matrix

Reviewed 2026-09-07 against current official vendor documentation. `Vendor-documented` does not mean locally tested by Rivune.

| Provider | Host route | Vendor status | Rivune status | Important requirements / limits |
|---|---|---|---|---|
| Codex CLI | macOS arm64/x64 | Vendor-documented | Existing macOS adapter | Standalone installer documented for macOS/Linux; first run requires choosing ChatGPT or another available sign-in method. |
| Codex CLI | Linux x64/arm64 | Vendor-documented | Proposed adapter; untested locally | POSIX discovery/launch seam is prototyped only. Exact distro/runtime coverage needs a real Linux CI lane. |
| Codex CLI | Native Windows x64/arm64 | Vendor-documented | Proposed adapter; untested locally | OpenAI documents native CLI use and native Windows sandbox modes. `winget` and administrator-approved sandbox setup can matter; enterprise policy can block setup. |
| Codex CLI | WSL2 x64/arm64 | Vendor-documented | Proposed adapter; untested locally | Treat as Linux: install, discover, and launch inside WSL. Do not reuse native Windows paths or PATHEXT. |
| Claude Code | macOS 13+ x64/arm64 | Vendor-documented | Existing macOS adapter | 4 GB+ RAM and internet required. Authentication/entitlement remains separate from installation. |
| Claude Code | Ubuntu 20.04+, Debian 10+, Alpine 3.19+ x64/arm64 | Vendor-documented | Proposed adapter; untested locally | Alpine/musl has additional runtime dependencies. Other distributions may be installable but remain unverified here. |
| Claude Code | Native Windows 10 1809+ / Server 2019+ x64/arm64 | Vendor-documented | Proposed adapter; untested locally | Native PowerShell/CMD supported. Git for Windows is optional; without it Claude uses PowerShell. Native Windows sandboxing is documented as unsupported. |
| Claude Code | WSL1/WSL2 x64/arm64 | Vendor-documented | Proposed adapter; untested locally | Install and run inside WSL, not PowerShell/CMD. WSL2 supports Claude sandboxing; WSL1 does not. |
| Either | unknown OS or unknown CPU | Not established | Unverified; fail closed | No launch until a reviewed platform adapter and test lane exist. |

Sources:

- OpenAI Codex CLI install/sign-in: https://developers.openai.com/codex/cli
- OpenAI native Windows sandbox and WSL distinction: https://developers.openai.com/codex/windows
- OpenAI Codex release architecture names and Windows installer: https://github.com/openai/codex/blob/main/README.md
- Anthropic system requirements, installs, Windows/WSL, and authentication: https://code.claude.com/docs/en/setup

No subscription-to-API inference is made. The matrix records vendor-documented install routes only; runtime capability discovery and explicit authentication checks remain mandatory.
