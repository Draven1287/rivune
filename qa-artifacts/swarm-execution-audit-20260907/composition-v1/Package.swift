// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SwarmCompositionCandidate",
    platforms: [.macOS(.v14)],
    products: [.library(name: "SwarmCompositionCandidate", targets: ["SwarmCompositionCandidate"])],
    dependencies: [
        .package(path: "../v2"),
        .package(path: "../filesystem-v3")
    ],
    targets: [
        .target(name: "SwarmCompositionCandidate", dependencies: [
            .product(name: "SwarmExecutionCandidate", package: "v2"),
            .product(name: "SwarmFilesystemAdapter", package: "filesystem-v3")
        ]),
        .testTarget(name: "SwarmCompositionCandidateTests", dependencies: ["SwarmCompositionCandidate"])
    ]
)
