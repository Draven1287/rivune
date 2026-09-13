# R2 Rust / JavaScript wire replay

The current R2 serde DTO definitions were extracted without modification; only the serde import was added. A small offline Rust executable serialized a synthetic workspace and acknowledgment, and deserialized renderer submit/retry shapes. The actual copied R2 core.mjs then parsed the Rust-generated JSON.

All previously failing cases now pass: workspace run conversationID, acknowledgment requestID, selectedProviderID, submit conversationID and retry sourceRunID/newRequestID. See SOURCE.json and WIRE_REVIEW.json.

This proves the tested cross-language DTO serialization boundary. It does not launch Tauri, invoke a provider, test IPC/CSP, validate persistence/process recovery, or establish full runtime acceptance. Original failed evidence remains unchanged in the sibling tauri-wire-contract-audit-20260907 package.
