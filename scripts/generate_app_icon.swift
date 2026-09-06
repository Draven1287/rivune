import AppKit
import Foundation

enum IconGenerationError: LocalizedError {
    case unreadableMaster(String)
    case couldNotCreateBitmap(Int)
    case couldNotEncode(Int)

    var errorDescription: String? {
        switch self {
        case let .unreadableMaster(path):
            "Could not read the Rivune master icon at \(path)"
        case let .couldNotCreateBitmap(size):
            "Could not create the \(size)x\(size) icon canvas"
        case let .couldNotEncode(size):
            "Could not encode the \(size)x\(size) icon as PNG"
        }
    }
}

let fileManager = FileManager.default
let currentDirectory = URL(fileURLWithPath: fileManager.currentDirectoryPath, isDirectory: true)
let defaultAssetDirectory = currentDirectory
    .appendingPathComponent("Rivune", isDirectory: true)
    .appendingPathComponent("Assets.xcassets", isDirectory: true)
    .appendingPathComponent("AppIcon.appiconset", isDirectory: true)

let masterURL = CommandLine.arguments.count > 1
    ? URL(fileURLWithPath: CommandLine.arguments[1])
    : defaultAssetDirectory.appendingPathComponent("RivuneAppIcon.png")
let outputDirectory = CommandLine.arguments.count > 2
    ? URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
    : defaultAssetDirectory

guard let master = NSImage(contentsOf: masterURL) else {
    throw IconGenerationError.unreadableMaster(masterURL.path)
}

try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

func writeVariant(size: Int) throws {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let graphicsContext = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw IconGenerationError.couldNotCreateBitmap(size)
    }

    bitmap.size = NSSize(width: size, height: size)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphicsContext
    graphicsContext.imageInterpolation = .high
    // Package the approved artwork in the macOS rounded tile, with clear
    // margins so Finder and the Dock render it at the normal system scale.
    let inset = CGFloat(size) * 0.06
    let tile = NSRect(x: inset, y: inset, width: CGFloat(size) - inset * 2, height: CGFloat(size) - inset * 2)
    NSBezierPath(roundedRect: tile, xRadius: tile.width * 0.22, yRadius: tile.height * 0.22).addClip()
    master.draw(
        in: tile,
        from: NSRect(origin: .zero, size: master.size),
        operation: .copy,
        fraction: 1
    )
    graphicsContext.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let data = bitmap.representation(using: .png, properties: [:]) else {
        throw IconGenerationError.couldNotEncode(size)
    }

    let destination = outputDirectory.appendingPathComponent("RivuneMac\(size).png")
    try data.write(to: destination, options: .atomic)
    print("Wrote \(destination.path)")
}

for size in [16, 32, 64, 128, 256, 512, 1024] {
    try writeVariant(size: size)
}
