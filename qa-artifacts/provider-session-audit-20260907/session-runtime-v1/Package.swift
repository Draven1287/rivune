// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "SessionRuntime", platforms: [.macOS(.v14)], products: [.library(name: "SessionRuntime", targets: ["SessionRuntime"])], targets: [.target(name: "SessionRuntime"), .testTarget(name: "SessionRuntimeTests", dependencies: ["SessionRuntime"])])
