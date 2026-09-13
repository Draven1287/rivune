# R5 build 001 result

- Release: `CENTRAL_BUILD_RELEASE_R5_001.md`
- Accepted receipt: `CENTRAL_ACCEPTED_PROJECT_R5_001.json`
- Accepted receipt SHA-256: `3de55e5f32363b0d43c05832a50e08da999eee6f7afdddbc8e34a320f0e42e36`
- Executor SHA-256: `1256d71507b38c7d9b8d17ab703b26ad66bc53e642238c1f68edda247f00323f`
- Execution count: one
- Compile result: release build completed in 1 minute 10 seconds
- Bundle result: one `Rivune.app` produced
- Qualification result: refused; `qualified_for_native_review` is `false`
- Blocking finding: `signature.not_bundle_sealed`; the bundle is linker-only ad hoc signed, its Info.plist is not bound, sealed resources are absent, and strict verification exits 1 with `code has no resources but signature indicates they must be present`
- App path: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`
- App tree SHA-256: `56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058`
- App executable SHA-256: `f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d`
- Evidence SHA-256: `17a35786895d720c6001301b1f65f5014268b81d0e51ab502f54621d8bac5521`
- Validation report SHA-256: `339e9a2399513f68b01b254b0e16ff2e6aa9451abc29d28181cc37e42a896ced`
- Metadata that did match: Rivune name, `com.rivune.desktop.development`, version `0.0.1`, arm64, minimum macOS `11.0`, SDK `27.0`.
- Warning retained: `LSRequiresCarbon` is present as legacy metadata even though it is false.
- Prior R3 rollback app was preserved before the build at `../tauri-r2-integration-review-20260907/r3-integration/rollback-r3-before-r5/Rivune-R3.app`; its recomputed tree SHA-256 remained `15a3e72e9fe558efe3f39af37eca06aaa109f853bd1989cb7018fc3292df04fa`.
- Stop boundary honored: no rebuild, signing, launch, installation, DMG, provider call, or publication.
