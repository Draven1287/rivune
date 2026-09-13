// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RivuneSharedPreview",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "RivunePreview", targets: ["RivunePreview"])],
    dependencies: [.package(url: "https://github.com/sparkle-project/Sparkle", from: "2.9.0")],
    targets: [
        .target(name: "AssetRouting"),
        .executableTarget(name: "RivunePreview", dependencies: ["AssetRouting", .product(name: "Sparkle", package: "Sparkle")], linkerSettings: [.unsafeFlags(["-Xlinker", "-rpath", "-Xlinker", "@executable_path/../Frameworks"])]),
        .testTarget(name: "AssetRoutingTests", dependencies: ["AssetRouting"])
    ]
)
