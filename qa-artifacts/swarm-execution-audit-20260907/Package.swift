// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SwarmExecutionCandidate",
    platforms: [.macOS(.v14)],
    products: [.library(name: "SwarmExecutionCandidate", targets: ["SwarmExecutionCandidate"])],
    targets: [
        .target(name: "SwarmExecutionCandidate"),
        .testTarget(name: "SwarmExecutionCandidateTests", dependencies: ["SwarmExecutionCandidate"])
    ]
)
