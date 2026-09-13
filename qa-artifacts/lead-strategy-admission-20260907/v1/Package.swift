// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "LeadStrategyAdmission", platforms: [.macOS(.v13)], products: [.library(name: "LeadStrategyAdmission", targets: ["LeadStrategyAdmission"])], targets: [.target(name: "LeadStrategyAdmission"), .testTarget(name: "LeadStrategyAdmissionTests", dependencies: ["LeadStrategyAdmission"])])
