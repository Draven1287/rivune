# Rust / frontend serialization mismatch

Compiled the exact DTO/derive/default block extracted from current host.rs using serde and serde_json. No tauri command, app host, provider, user data, or destination state was invoked. The extraction identity is in SOURCE.json; generated Rust output is RUST_WIRE.json.

Feeding the actual serialized snapshot/acknowledgement into the unchanged core.mjs demonstrates:
- A run uses conversationId; parseSnapshot expects conversationID and rejects it.
- Acknowledgement requestId is not recognized as requestID, so accepted becomes uncertain.
- selectedProviderId is not read by the frontend's selectedProviderID lookup.
- Frontend submit conversationID is rejected by actual Rust Deserialize as missing conversationId.
- Frontend retry sourceRunID/newRequestID is rejected as missing sourceRunId.

Results in WIRE_REVIEW.json. Runtime owner has the blocking integration finding. Add bidirectional cross-language contract tests using generated payloads, rather than independently constructed matching mocks. The audit proves serialization incompatibility; it is not a full Tauri launch test.
