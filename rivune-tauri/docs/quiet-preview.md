# Quiet workspace and shared macOS preview

Implemented September 12, 2026 from the approved third restrained concept, with the requested compact perspectives disclosure.

The shared UI now defaults once to Quiet: graphite, subtle upper-right cosmic haze, still atmosphere, readable conversation typography, and restrained menus. Existing environment choices remain available. The transcript scrolls independently of the composer. The authored Council example streams locally, presents a synthesis and three contributions, and preserves them in conversation history. Every example stays labelled; no provider is represented as having answered.

Run `npm run dev` for the browser. From this directory, `./macos-preview/script/build.sh` builds the same frontend and packages the separate macOS app at `macos-preview/build/Rivune Preview.app`. The native preview has its own bundle ID and WebKit data store. It does not replace the older Swift app or migrate its data. Read macos-preview/README.md for full scope and build details.

Verification: frontend production build passed; all 43 shared tests passed with localhost mock endpoints enabled; native Swift compile, three router tests, plist and ad hoc signature validation passed. CUA launched the packaged native app, completed local onboarding, ran the Council example, and expanded contributions. Browser checks confirmed restored contributions and separate transcript scrolling. No paid API request was made.

Update September 12: [Claude account chat](claude-local-chat.md) now streams real replies in the local Vite preview. Two live account requests verified a reply and remembered follow-up. Responses and reported usage are stored separately from simulations.

Remaining: packaged desktop provider execution, additional providers and live Council/Swarm orchestration, native export support, native Liquid Glass beyond ordinary system window chrome, data migration, Developer ID signing/notarization, installers and updates. Windows/Linux packaging was not executed. This is a local development preview, not a release or claim of superiority to other products.
