// Release-tool check only. Reads the public key embedded in the app, never a private key.
import CryptoKit
import Foundation

func refuse(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

guard CommandLine.arguments.count == 4 else {
    refuse("Usage: verify_update_signature.swift ARCHIVE PUBLIC_KEY SIGNATURE")
}
guard let publicKey = Data(base64Encoded: CommandLine.arguments[2]), publicKey.count == 32,
      let signature = Data(base64Encoded: CommandLine.arguments[3]), signature.count == 64 else {
    refuse("Invalid Ed25519 public key or signature encoding.")
}
do {
    let key = try Curve25519.Signing.PublicKey(rawRepresentation: publicKey)
    let archive = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]), options: .mappedIfSafe)
    guard key.isValidSignature(signature, for: archive) else {
        refuse("Update signature does not match the archive and app public key.")
    }
    print("Update signature matches the archive and app public key.")
} catch {
    refuse("Unable to verify update archive: \(error.localizedDescription)")
}
