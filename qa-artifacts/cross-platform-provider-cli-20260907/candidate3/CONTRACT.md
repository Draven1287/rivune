# OS-neutral provider CLI runner contract

Status: isolated prototype; no production integration.

1. Host detection produces an explicit OS route (`macOS`, `linux`, `windowsNative`, `windowsWSL`, or `unknown`) and CPU architecture. WSL is not treated as native Windows.
2. Discovery receives an injected environment and filesystem checker. It never sources shell startup files, searches the full disk, reads credentials, or executes a provider.
3. A configured absolute path takes precedence over PATH. POSIX PATH uses `:`; native Windows PATH uses `;` and a validated `PATHEXT`.
4. Execution is a typed `CommandRequest`: host, rooted executable path, argument array, stdin bytes, working directory, and environment. The runner validates the rooted path again and always reduces the environment to its allowlist before calling the launcher. These guarantees cannot be bypassed by calling the runner directly.
5. Native Windows environment keys are matched case-insensitively. Relative PATH entries are ignored. Drive-relative paths such as `C:tools\\codex.exe` are rejected.
6. Native Windows `.cmd`, `.bat`, and `.ps1` wrappers fail closed consistently during PATH discovery, explicit-path discovery, and execution even if discovery is bypassed. This prototype accepts only direct `.exe` or `.com` binaries and never constructs a shell command string.
7. Unsupported or unverified routes fail closed before launch with provider-facing feedback.
8. Authentication is a separate user-driven state. Finding an executable does not prove sign-in, account entitlement, API access, model availability, or billing status.
9. Tests use injected filesystem and process doubles. They never invoke `codex`, `claude`, a shell, a network, or an account.

The contract deliberately does not define provider output parsing. Rivune's existing Codex JSONL and Claude JSON parsers remain provider-specific adapters above this seam.
