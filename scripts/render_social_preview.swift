import AppKit
import Foundation
// Code-defined social layout; reuse approved identity assets unchanged.
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let width = 1200, height = 630
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: width * 4, bitsPerPixel: 32)!
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor(calibratedRed: 0.035, green: 0.04, blue: 0.055, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
func asset(_ name: String) -> NSImage {
    guard let image = NSImage(contentsOf: root.appendingPathComponent("brand/" + name)) else { fatalError("Missing asset: " + name) }
    return image
}
asset("rivune-orbit-stars.png").draw(in: NSRect(x: 62, y: 118, width: 395, height: 395))
asset("rivune-wordmark.svg").draw(in: NSRect(x: 495, y: 388, width: 595, height: 59))
func text(_ value: String, _ rect: NSRect, _ size: CGFloat, _ color: NSColor) {
    let style = NSMutableParagraphStyle(); style.lineSpacing = 7
    (value as NSString).draw(in: rect, withAttributes: [.font: NSFont.systemFont(ofSize: size, weight: .medium), .foregroundColor: color, .paragraphStyle: style])
}
text("Your AI tools.\nOne reviewed result.", NSRect(x: 495, y: 212, width: 640, height: 135), 42, .white)
text("Native Mac workspace · Open-source preview", NSRect(x: 495, y: 155, width: 630, height: 38), 21, NSColor(calibratedWhite: 0.7, alpha: 1))
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: root.appendingPathComponent("og.png"))
