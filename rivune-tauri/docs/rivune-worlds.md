# Stillwater and the reading layer

Stillwater is the only visible environment. The previous picker and Between sessions rotation are removed from the app. Existing saved choices no longer switch the scene; all sessions use Stillwater. The silver R remains unchanged.

A stationary procedural night scene combines dark water, two faint mountain silhouettes, blue-grey haze and restrained silver reflections. There is no moon, star field, camera flight, cursor parallax or response-status pulse. Optional gentle surface motion pauses during conversations, when the window is hidden, and with reduced motion. Still is the default. The renderer caps at 24 frames per second, 1100 by 800 pixels and requests a low-power GPU. Missing WebGL falls back to a dark gradient.

The home composer is docked to the bottom of the available workspace with prompt suggestions immediately above it. On short windows, suggestions yield space to the composer. Conversation content stays on opaque #121820; stronger CSS glass is reserved for menus and navigation. This is not native Apple Liquid Glass or a physical water simulation.

Archived chats live in Account & settings → Archived chats. Open an archived conversation there or restore it to Recent chats. Per-chat sidebar actions retain archive/delete controls. The unused header ellipsis is hidden, and composer options use a sliders icon.

Connections displays per-provider account status and reply availability. Startup/manual installation and sign-in checks send no model prompt. Results stay in memory for this session. Claude can reply only through the supported local development adapter after account verification; Codex, Gemini and Grok reply adapters remain unfinished. The packaged Swift shared preview has no provider bridge and reports account checks unavailable. API simulations remain optional and make no paid calls.
