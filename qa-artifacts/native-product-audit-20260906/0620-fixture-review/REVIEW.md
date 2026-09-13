# 0620 fixture isolation review

Bounded source acceptance: no actionable defect found in the new artifact fixture branch. Source read from `/private/tmp/rivune-review-2026090620/source`; hashes recorded in receipt.json. No UI, compile, install, auth or provider call performed. Polish was outside this narrow verdict; AF02 remains closed.

- Store lines 260–272 require both isolated launch and uiPreview, then the explicit --artifact-continuation-qa argument. Normal mode ignores that argument. BrandMigration resolver gives hosted tests precedence over preview. Fixture construction only encodes two explicitly fictional in-memory file responses and sets readiness display; it does not dispatch.
- RivuneApp lines 187–192 creates Store with the bridge only, with no coordinator/storage injection. Isolated Store has nil run journal, project storage and draft storage. It returns before personal history/team load, bridge configuration/start and normal initialization. loadWorkspaceDraft returns immediately with nil URL; history saving also rejects isolation.
- Native canSend rejects isolation; send lines 1417–1423 returns before admission regardless of readiness. Direct retry reaches send; the added fixtures are completed ChatGPT turns with no Council record to retry.
- HTTP run route retains allowsWorkspaceRequests gating; app-created isolated Store sets it false. Local server startup independently rejects isolated mode without its explicit test allowance, and PeerBridge retains isolation guards. No fixture runner injection or endpoint change.
- Account source retains trusted-bundle/isolated policy and no injected backend at app entry; the new branch does not access it. This is unchanged policy inspection, not a live account test.

The internal submitWorkspaceRun method remains callable by deterministic injected-coordinator tests; its existence is not evidence that the added UI fixture can bypass native send or HTTP guards. No general claim that all internal methods enforce isolation independently is made.

This fixture can validate chip/action/draft UI but cannot prove actual send admission or model behavior: the unchanged isolated send guard intentionally stops first. Owner must report those checks separately from the supplied deterministic tests.
