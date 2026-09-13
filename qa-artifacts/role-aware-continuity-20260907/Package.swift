// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "RoleAwareContinuity",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [.library(name: "RoleAwareContinuity", targets: ["RoleAwareContinuity"])],
    targets: [
        .target(name: "RoleAwareContinuity"),
        .testTarget(name: "RoleAwareContinuityTests", dependencies: ["RoleAwareContinuity"])
    ]
)
