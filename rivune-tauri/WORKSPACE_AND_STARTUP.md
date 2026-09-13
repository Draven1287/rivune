# Workspace and startup direction

Confirmed September 11 in the current task.

Startup is a separate launch screen after a full app quit/relaunch. It stays visible while the backend checks configured CLI/API connections, then transitions to this working screen. Existing source includes Rivune/SpaceStartupView.swift and StartupReadiness.swift; the other React frontend has StartupFallback.tsx. Their presence is not proof that this small rivune-tauri preview performs provider checks. Reconcile real readiness states and retained data before wiring the launch transition; do not implement a cosmetic timer that claims providers are ready.

Deferred user edits to the existing launch page: remove the ball from the logo and use gray throughout. This workspace pass does not alter that page.

Working screen: smaller floating R; direct work-oriented heading; prominent composer; Single AI / Constellation Engine and selected provider/team beside it. Sidebar holds New conversation, Search, Projects, recent chats, Connections, Settings, and a bottom account control.

Settings categories: Account, AI connections, Appearance, Data & privacy, Keyboard. Appearance motion, local export and confirmed clearing remain functional. Account and AI connection panels truthfully describe their unavailable integration.

Account identity contract for later authentication integration: use the authenticated Rivune session to render the user's display name and avatar/initials in the bottom account control and Account panel. Show email only in Account details, not in the narrow sidebar. Do not infer identity from OS user, CLI login, typed local names, or connected provider membership. Until authentication exists, display Local workspace / Not signed in. On sign-out clear the rendered identity and preserve local drafts according to the future account-data contract. No password, token, or sign-in endpoint is introduced by this design pass.

Validation in this pass: frontend production build, browser-rendered desktop workspace/account settings, category switching, existing Appearance motion controls, Data export control presence, and 390px settings layout. Actual account login, export download, provider checks, native startup, and release were not verified.
