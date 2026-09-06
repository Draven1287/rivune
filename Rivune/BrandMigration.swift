import Foundation

/// UI inspection and hosted XCTest runs must never open personal history,
/// migrate credentials, start the phone bridge, or invoke a signed-in model.
enum RivuneLaunchContext: Equatable, Sendable {
    case normal
    case uiPreview
    case tests

    static let current = resolve(
        arguments: ProcessInfo.processInfo.arguments,
        environment: ProcessInfo.processInfo.environment,
        hasXCTestRuntime: NSClassFromString("XCTestCase") != nil,
        hasUIPreviewInfoFlag: Bundle.main.object(forInfoDictionaryKey: "RivuneUIPreview") as? Bool == true
    )

    static var isIsolated: Bool { current != .normal }

    static func resolve(
        arguments: [String],
        environment: [String: String],
        hasXCTestRuntime: Bool = false,
        hasUIPreviewInfoFlag: Bool = false
    ) -> Self {
        let testEnvironmentKeys = [
            "XCTestConfigurationFilePath", "XCTestBundlePath", "XCTestSessionIdentifier"
        ]
        if hasXCTestRuntime || testEnvironmentKeys.contains(where: { environment[$0] != nil }) {
            return .tests
        }
        return arguments.contains("--ui-preview") || hasUIPreviewInfoFlag ? .uiPreview : .normal
    }
}

/// Centralizes the public Rivune identity while keeping the identifiers that
/// existing Alloy installs wrote to disk readable during the rename.
enum RivuneBrand {
    static let displayName = "Rivune"

    static let defaultsPrefix = "rivune"
    static let legacyDefaultsPrefix = "alloy"
    static let defaultsMigrationMarker = "rivune.brandMigration.defaults.v1"

    static let historyDirectoryName = "Rivune"
    static let legacyHistoryDirectoryNames = ["Alloy"]

    static let keychainService = "com.aaravshah.rivune.bridge"
    static let legacyKeychainServices = ["com.aaravshah.alloy.bridge"]

    /// Bonjour service types are protocol identifiers rather than display
    /// names. Retaining the legacy value keeps already-paired Mac and iPhone
    /// builds discoverable across the rename.
    static let bridgeServiceType = "_alloy-bridge._tcp"

    /// These bundle identifiers deliberately remain stable so Rivune installs
    /// as an update and retains the existing app container and preferences.
    static let legacyMacBundleIdentifier = "com.aaravshah.alloy.mac"
    static let legacyIOSBundleIdentifier = "com.aaravshah.alloy.ios"

    private static let migratedDefaultSuffixes = [
        "defaultMode",
        "conversationContext",
        "subtleMotion",
        "codexModel",
        "claudeModel",
        "codexEffort",
        "claudeEffort",
        "togetherSharingApproved",
        "togetherSharingApprovalVersion",
        "bridgeAdvertising"
    ]

    static func defaultsKey(_ suffix: String) -> String {
        "\(defaultsPrefix).\(suffix)"
    }

    static func legacyDefaultsKey(_ suffix: String) -> String {
        "\(legacyDefaultsPrefix).\(suffix)"
    }

    /// Copies each legacy preference only when the Rivune key has no value.
    /// Legacy values are intentionally left untouched. The marker prevents a
    /// later user reset from being undone by importing the same old value again.
    static func migrateLegacyDefaults(in defaults: UserDefaults = .standard) {
        guard !defaults.bool(forKey: defaultsMigrationMarker) else { return }

        for suffix in migratedDefaultSuffixes {
            let currentKey = defaultsKey(suffix)
            guard defaults.object(forKey: currentKey) == nil,
                  let legacyValue = defaults.object(forKey: legacyDefaultsKey(suffix)) else {
                continue
            }
            defaults.set(legacyValue, forKey: currentKey)
        }

        defaults.set(true, forKey: defaultsMigrationMarker)
    }

    static var keychainServiceCandidates: [String] {
        [keychainService] + legacyKeychainServices
    }
}
