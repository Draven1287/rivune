"""Restore the reviewed retry delta only onto its exact pre-reboot baselines.

This writes isolated candidate files, never the supplied baselines or app source.
"""
from pathlib import Path
import argparse
import difflib
import hashlib
import json

EXPECTED = {
    "Models.swift": "c8c2f816dbf6e87936408317e233e2808aa62c932653cb8fa2f6b310558f2766",
    "RivuneStore.swift": "0b5aa05183d225089213f9bab28b62a5145a8bcaa0376a4cca56cb0ccb9cdb7f",
    "RivuneWebWorkspace.swift": "aba96198ce8db628adc2cf8ba2fe5ce2142f1349ae9608e47ad9e920ffd3cf36",
    "RivuneRunCoordinator.swift": "f032cdca1d65b779482dbc782275b7238f6285207fb23516a0620109dfe123f9",
}

def replace_once(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f"Expected exactly one replacement anchor: {old[:100]!r}")
    return source.replace(old, new, 1)

def transform(name, source):
    replacements = {
        "Models.swift": [
            ("    var selectedArtifact: ArtifactContinuation?\n    // Optional so history", "    var selectedArtifact: ArtifactContinuation?\n    // Absent in legacy history; never invent an original request context.\n    var retryContext: WorkspaceRetryContext?\n    // Optional so history"),
            ("        self.selectedArtifact = selectedArtifact\n    }\n}\n\nstruct Conversation:", "        self.selectedArtifact = selectedArtifact\n        self.retryContext = nil\n    }\n}\n\nstruct Conversation:"),
        ],
        "RivuneWebWorkspace.swift": [
            ("        approvedProjectInstructions: String? = nil\n    ) throws -> WorkspaceRun", "        approvedProjectInstructions: String? = nil,\n        frozenPromptContext: ApprovedPromptContext? = nil\n    ) throws -> WorkspaceRun"),
            ("        let promptContext = ApprovedPromptContext(\n            priorConversation: memoryEnabled", "        let promptContext = frozenPromptContext ?? ApprovedPromptContext(\n            priorConversation: memoryEnabled"),
        ],
        "RivuneRunCoordinator.swift": [
            ("            for run in loadedRuns {\n", "            for run in loadedRuns {\n                if let retry = run.turn.retryContext {\n                    _ = try retry.validatedContext(conversationID: run.conversationID, turnID: run.turn.id,\n                        prompt: run.turn.prompt, attachments: run.turn.attachments, selectedArtifact: run.turn.selectedArtifact)\n                }\n"),
            ("        guard promptContext.isStructurallyValid,", "        try WorkspaceRetryContext.validateContext(promptContext)\n        guard promptContext.isStructurallyValid,"),
            ("        var admittedTurn = turn\n", "        var admittedTurn = turn\n        if turn.mode != .council {\n            admittedTurn.retryContext = try WorkspaceRetryContext(conversationID: conversationID,\n                turnID: turn.id, prompt: turn.prompt, context: promptContext)\n        }\n"),
            ("        runs[index].turn = turn\n        runs[index].stage = stage", "        // Together rebuilds ChatTurn during execution. Preserve the run-owned\n        // admitted context through every progress and terminal replacement.\n        var updatedTurn = turn\n        updatedTurn.retryContext = runs[index].turn.retryContext\n        runs[index].turn = updatedTurn\n        runs[index].stage = stage"),
        ],
        "RivuneStore.swift": [
            ("        if turn.mode == .together,\n           !allowTogetherOnce,", "        #if os(macOS)\n        do { _ = try originalRetryContext(for: turn, conversationID: conversationID) }\n        catch { showPrototypeNotice(error.localizedDescription); return }\n        #endif\n        if turn.mode == .together,\n           !allowTogetherOnce,"),
            ("    private func retryWorkspaceTurnWithoutReplacingDraft(_ turn: ChatTurn, conversationID: UUID) {", "    #if os(macOS)\n    private func originalRetryContext(for turn: ChatTurn, conversationID: UUID) throws -> ApprovedPromptContext {\n        guard let stored = conversations.first(where: { $0.id == conversationID })?.turns.first(where: { $0.id == turn.id }),\n              stored.prompt == turn.prompt, stored.mode == turn.mode, stored.attachments == turn.attachments,\n              stored.selectedArtifact == turn.selectedArtifact, stored.retryContext == turn.retryContext else {\n            throw WorkspaceRetryContextError.changedSource\n        }\n        guard let retry = turn.retryContext else { throw WorkspaceRetryContextError.unavailable }\n        return try retry.validatedContext(conversationID: conversationID, turnID: turn.id, prompt: turn.prompt,\n            attachments: turn.attachments, selectedArtifact: turn.selectedArtifact)\n    }\n    #endif\n\n    private func retryWorkspaceTurnWithoutReplacingDraft(_ turn: ChatTurn, conversationID: UUID) {"),
            ("        if turn.mode == .together { allowTogetherOnce = false }\n        #if os(macOS)\n        do {\n            let run = try submitWorkspaceRun(", "        if turn.mode == .together { allowTogetherOnce = false }\n        #if os(macOS)\n        do {\n            guard isWorkspaceDraftReadable else { throw ArtifactContinuationError.unreadableDraft }\n            guard allowsWorkspaceRequests else { throw WorkspaceInputError.unavailable }\n            let frozen = try originalRetryContext(for: turn, conversationID: conversationID)\n            let run = try submitWorkspaceRun("),
            ("                requestKey: UUID().uuidString,\n                selectedArtifact: turn.selectedArtifact\n", "                requestKey: UUID().uuidString,\n                selectedArtifact: turn.selectedArtifact,\n                frozenPromptContext: frozen\n"),
            ('            return String(decoding: data, as: UTF8.self).contains("\\"selectedArtifact\\"")', '            return String(decoding: data, as: UTF8.self).contains("\\"selectedArtifact\\"")\n                || String(decoding: data, as: UTF8.self).contains("\\"retryContext\\"")'),
            ('                return object.keys.contains("selectedArtifact") || object.values.contains(where: containsArtifactField)', '                return object.keys.contains("selectedArtifact") || object.keys.contains("retryContext")\n                    || object.values.contains(where: containsArtifactField)'),
            ('                    let selected = try selection(turn["selectedArtifact"])', '                    if let rawRetry = turn["retryContext"], !(rawRetry is NSNull) {\n                        let decoded = try JSONDecoder().decode(ChatTurn.self, from: JSONSerialization.data(withJSONObject: turn))\n                        guard let rawConversationID = conversation["id"] as? String,\n                              let conversationID = UUID(uuidString: rawConversationID),\n                              let retry = decoded.retryContext else { return true }\n                        _ = try retry.validatedContext(conversationID: conversationID, turnID: decoded.id,\n                            prompt: decoded.prompt, attachments: decoded.attachments, selectedArtifact: decoded.selectedArtifact)\n                    }\n                    let selected = try selection(turn["selectedArtifact"])'),
        ],
    }
    for old, new in replacements[name]:
        source = replace_once(source, old, new)
    return source

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True, help="Folder with the four exact Swift baseline files")
    parser.add_argument("--output", type=Path, required=True, help="A new, nonexistent isolated candidate directory")
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("Output already exists; refusing to overwrite")
    original = {}
    for name, expected in EXPECTED.items():
        data = (args.baseline / name).read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        if actual != expected:
            raise SystemExit(f"Baseline mismatch for {name}: {actual}; no output written")
        original[name] = data.decode()
    changed = {name: transform(name, source) for name, source in original.items()}
    # All hashes and anchors must pass before any output directory is created.
    source_dir = args.output / "source" / "Rivune"
    source_dir.mkdir(parents=True)
    for name, source in changed.items():
        (source_dir / name).write_text(source)
    new_file = Path(__file__).parent / "source/Rivune/WorkspaceRetryContext.swift"
    (source_dir / new_file.name).write_bytes(new_file.read_bytes())
    patches = []
    for name, source in changed.items():
        patches.extend(difflib.unified_diff(original[name].splitlines(True), source.splitlines(True), fromfile=f"a/Rivune/{name}", tofile=f"b/Rivune/{name}"))
    patches.extend(difflib.unified_diff([], new_file.read_text().splitlines(True), fromfile="/dev/null", tofile=f"b/Rivune/{new_file.name}"))
    (args.output / "integration.patch").write_text("".join(patches))
    (args.output / "BASELINE.json").write_text(json.dumps(EXPECTED, indent=2) + "\n")
    print("Restored isolated source; rerun tests and independent review before integration.")

if __name__ == "__main__":
    main()
