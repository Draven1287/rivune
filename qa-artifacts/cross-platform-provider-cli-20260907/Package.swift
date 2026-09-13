// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CrossPlatformProviderCLI",
    platforms: [.macOS(.v13)],
    products: [.library(name: "CrossPlatformProviderCLI", targets: ["CrossPlatformProviderCLI"])],
    targets: [
        .target(name: "CrossPlatformProviderCLI"),
        .testTarget(name: "CrossPlatformProviderCLITests", dependencies: ["CrossPlatformProviderCLI"])
    ]
)
