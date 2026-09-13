// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PhoneDurableJournalCandidate",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "PhoneDurableJournalCandidate", targets: ["PhoneDurableJournalCandidate"])
    ],
    targets: [
        .target(name: "PhoneDurableJournalCandidate"),
        .testTarget(
            name: "PhoneDurableJournalCandidateTests",
            dependencies: ["PhoneDurableJournalCandidate"]
        )
    ]
)
