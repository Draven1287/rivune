enum RivuneHistoryStorage {
    enum SaveMode: Equatable {
        case standard
        case privacyDeletion
    }

    private static var defaultApplicationSupportDirectory: URL? {
        FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first
    }

    static func currentFileURL(in applicationSupport: URL) -> URL {
        applicationSupport
            .appendingPathComponent(RivuneBrand.historyDirectoryName, isDirectory: true)
            .appendingPathComponent("conversations.json", isDirectory: false)
    }

    private static func backupURL(for fileURL: URL) -> URL {
        fileURL.deletingLastPathComponent()
            .appendingPathComponent("conversations.backup.json", isDirectory: false)
    }

    /// Reads Rivune first, then the legacy Alloy primary and backup files. The
    /// ordering is public to the test target so compatibility cannot regress.
    static func candidateFileURLs(in applicationSupport: URL) -> [URL] {
        let directoryNames = [RivuneBrand.historyDirectoryName]
            + RivuneBrand.legacyHistoryDirectoryNames
        return directoryNames.flatMap { directoryName in
            let primary = applicationSupport
                .appendingPathComponent(directoryName, isDirectory: true)
                .appendingPathComponent("conversations.json", isDirectory: false)
            return [primary, backupURL(for: primary)]
        }
    }

    /// Legacy recovery remains unchanged; invalid explicit file revisions must never
    /// cause normalization or fallback to replace the original history.
    static func artifactRecoveryRequired(in applicationSupport: URL? = nil) -> Bool {
        guard let root = applicationSupport ?? defaultApplicationSupportDirectory else { return false }
        for candidate in candidateFileURLs(in: root) {
            guard let data = try? Data(contentsOf: candidate) else { continue }
            if hasInvalidArtifactSelections(data) { return true }
            // The first decodable candidate is authoritative. Unused backups
            // and legacy histories must not invalidate healthy current data.
            if (try? JSONDecoder().decode([Conversation].self, from: data)) != nil { return false }
        }
        return false
    }

    static func hasInvalidArtifactSelections(_ data: Data) -> Bool {
        guard let conversations = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            // A truncated file containing this new field cannot be admitted as a legacy file.
            return String(decoding: data, as: UTF8.self).contains("\"selectedArtifact\"")
        }
        func containsArtifactField(_ value: Any) -> Bool {
            if let object = value as? [String: Any] {
                return object.keys.contains("selectedArtifact") || object.values.contains(where: containsArtifactField)
            }
            if let array = value as? [Any] { return array.contains(where: containsArtifactField) }
            return false
        }
        for conversation in conversations {
            guard let rawTurns = conversation["turns"] as? [Any] else {
                if let malformed = conversation["turns"], containsArtifactField(malformed) { return true }
                continue
            }
            for rawTurn in rawTurns {
                guard let turn = rawTurn as? [String: Any] else {
                    if containsArtifactField(rawTurn) { return true }
                    continue
                }
                let council = turn["councilRun"] as? [String: Any]
                if council == nil, let malformed = turn["councilRun"], containsArtifactField(malformed) { return true }
                do {
                    func selection(_ raw: Any?) throws -> ArtifactContinuation? {
                        guard let raw, !(raw is NSNull) else { return nil }
                        return try JSONDecoder().decode(ArtifactContinuation.self, from: JSONSerialization.data(withJSONObject: raw, options: [.fragmentsAllowed]))
                    }
                    let selected = try selection(turn["selectedArtifact"])
                    let frozen = try selection(council?["selectedArtifact"])
                    if selected != nil || frozen != nil {
                        guard let mode = turn["mode"] as? String,
                              [IntelligenceMode.chatGPT.rawValue, IntelligenceMode.claude.rawValue, IntelligenceMode.council.rawValue].contains(mode),
                              council == nil || selected == frozen else { return true }
                    }
                } catch { return true }
            }
        }
        return false
    }

    static func load() -> [Conversation] {
        guard let applicationSupport = defaultApplicationSupportDirectory else { return [] }
        return load(from: applicationSupport)
    }

    static func load(from applicationSupport: URL) -> [Conversation] {
        guard !artifactRecoveryRequired(in: applicationSupport) else { return [] }
        let currentURL = currentFileURL(in: applicationSupport)
        for candidate in candidateFileURLs(in: applicationSupport) {
            guard let data = try? Data(contentsOf: candidate),
                  let conversations = try? JSONDecoder().decode([Conversation].self, from: data) else {
                continue
            }
            let normalized = normalizeLoadedConversations(conversations)
            if normalized.didChange || candidate != currentURL {
                save(normalized.conversations, in: applicationSupport)
            }
            return normalized.conversations.sorted { $0.updatedAt > $1.updatedAt }
        }
        return []
    }

    @discardableResult
    static func save(
        _ conversations: [Conversation],
        in applicationSupport: URL,
        mode: SaveMode = .standard
    ) -> Bool {
        if mode == .standard, artifactRecoveryRequired(in: applicationSupport) { return false }
        let fileURL = currentFileURL(in: applicationSupport)
        let backupURL = backupURL(for: fileURL)
        guard let data = try? JSONEncoder().encode(conversations) else { return false }

        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            switch mode {
            case .standard:
                if let existing = try? Data(contentsOf: fileURL),
                   (try? JSONDecoder().decode([Conversation].self, from: existing)) != nil {
                    try existing.write(to: backupURL, options: [.atomic])
                }
            case .privacyDeletion:
                // Remove any pre-delete recovery copy before replacing the
                // primary file. The fresh backup below contains only the
                // post-delete state, so deleted prompts and attachments do not
                // survive solely in conversations.backup.json.
                if FileManager.default.fileExists(atPath: backupURL.path) {
                    try FileManager.default.removeItem(at: backupURL)
                }
            }
            try data.write(to: fileURL, options: [.atomic])
            if mode == .privacyDeletion {
                try data.write(to: backupURL, options: [.atomic])
            }
            #if os(iOS)
            for protectedURL in [fileURL, backupURL] {
                try? FileManager.default.setAttributes(
                    [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                    ofItemAtPath: protectedURL.path
                )
            }
            #endif
            return true
        } catch {
            return false
        }
    }
}
