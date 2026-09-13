# R6 corrected preflight invocation release002

Attempt001 stopped at CARGO_HOME environment mismatch before metadata/build. No app/evidence generated. Central releases one corrected executor invocation with same accepted receipt011450ff14f9c4eb757a714736e8634d4899cd0435073c1a3eba31ba957820f1 and executor1256d715.

Runtime must spawn exact executor argv using an explicit environment constructed from receipt.buildEnvironment for all six required variables, rather than relying on inherited shell values. Preserve other executor safeguards; do not change receipts to match an uncontrolled environment. Record actual values of only these known nonsensitive variables and argv in result. Do not dump all environment.

R5preservation verified, output absent and evidence root empty. Revalidate source/tool/metadata/current inputs through unchanged executor. Use sole target-candidate4-r2. One invocation, stop and report failures; no autonomous repeated runs.

All prior R6build boundaries remain: no sign/native launch/install/DMG/provider/public action. No preflight bypass; this only corrects execution environment.

Accepted environment:
{
  "CARGO_HOME": "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo",
  "RUSTUP_HOME": "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/rustup",
  "CARGO_TARGET_DIR": "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2",
  "SDKROOT": "/Applications/Xcode-beta.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX27.0.sdk",
  "PATH": "/Users/Aaravshah/.local/bin:/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin",
  "CARGO_NET_OFFLINE": "true"
}
