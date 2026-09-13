// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SwarmFilesystemAdapter",
    platforms: [.macOS(.v14)],
    products: [.library(name: "SwarmFilesystemAdapter", targets: ["SwarmFilesystemAdapter"])],
    targets: [
        .target(name: "SwarmFilesystemAdapter"),
        .testTarget(name: "SwarmFilesystemAdapterTests", dependencies: ["SwarmFilesystemAdapter"])
    ]
)
