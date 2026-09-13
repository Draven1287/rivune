# Rivune installer readiness candidate 5

Candidate 5 is an offline packaging gate, approved-asset derivative set, and unapplied runtime patch.

- Cargo metadata is invoked with `--locked --offline` through the validated Cargo proxy. Every transitive local package reported with `source: null` outside the project working directory is tree-hashed and must exactly match the v5 receipt.
- Build/package plans add locked and offline Cargo arguments and set `CARGO_NET_OFFLINE=true` when executed.
- Product identity requires Rivune product/window names, an explicit `[[bin]]` named `rivune`, exact platform package targets, and structurally valid PNG/ICO/ICNS image containers.
- `icons/` contains only format derivatives of the existing approved galaxy/R artwork: a 512px PNG, a six-size Windows ICO, and the previously verified macOS ICNS.

The runtime patch remains unapplied so the runtime owner can integrate it without overlapping source edits. No installer or Rust target was built.

Run `npm test` and `npm run check`. Tests inject Cargo metadata and a recording package runner; they do not access the network or invoke a real build.
