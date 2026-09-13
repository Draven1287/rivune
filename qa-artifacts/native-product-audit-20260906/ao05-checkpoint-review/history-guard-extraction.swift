    static func hasInvalidArtifactSelections(_ data: Data) -> Bool {
        guard let conversations = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            // A truncated file containing this new field cannot be admitted as a legacy file.
            return String(decoding: data, as: UTF8.self).contains("\"selectedArtifact\"")
        }
        for conversation in conversations {
            for turn in conversation["turns"] as? [[String: Any]] ?? [] {
                let council = turn["councilRun"] as? [String: Any]
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
