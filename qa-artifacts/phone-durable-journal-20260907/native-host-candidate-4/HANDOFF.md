# Native phone host integration candidate 4

Candidates 1 through 3 remain preserved and rejected. Candidate 4 retains the independently reconstructed Candidate 3 foundation and adds one narrow correction for Candidate 3's reproduced offline-Stop defect.

On iPhone, Stop is now persisted against the original saved Mac identity before checking any live peer. If the phone is offline or paired to another Mac, the durable operation stays `stopRequested`; reconnect logic can send only Stop to the original Mac and cannot fall back to the original prompt. Legacy unbound records fail closed without inventing an owner. The transport still requires the exact original principal and a current connection generation.

Verification on this exact isolated source: 17 focused durable-host tests passed; the full native Mac suite passed 341 tests with zero failures and zero skips; Mac Release and generic iOS Simulator Release both succeeded. The only source diagnostic is Xcode's expected AppIntents metadata-skip warning because these targets do not link AppIntents; Xcode also reports the expected multiple-macOS-destination selection warning.

No live provider call, physical-iPhone session, shared-source apply, installed-app replacement, publishing, or release occurred. Real-device pairing and provider execution remain explicitly unverified.
