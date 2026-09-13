# Direct-download software updates

The native Mac target links official Sparkle 2.9.6 and uses
SPUStandardUpdaterController. Check for Updates is in the app menu and Software
Updates is in Settings > General. Sparkle owns update discovery, release notes,
download/verification UI, skip/later choices, and installation. Rivune waits for
active runs and flushes draft, history, and project storage before allowing relaunch.
A successfully installed expected build shows one small notice once.

Local builds remain unavailable and never start Sparkle. Activation requires all
of: RivuneDistribution=developer-id; HTTPS SUFeedURL; a 32-byte base64
SUPublicEDKey; RivuneUpdateTeamID matching a valid Developer ID application
signature. No production values are supplied by this change. App Store work must
use APP_STORE compilation condition AND omit the Sparkle package from its separate
target; it must rely on App Store updates instead.

The existing DMG packager can prepare a local appcast only after its public gates,
using RIVUNE_PREPARE_UPDATE_FEED=1 and the explicit variables at the end of
scripts/package_macos_dmg.sh. scripts/prepare_update_feed.py independently checks
the report/checksum, DMG and app notarization/staples/Gatekeeper, expected bundle,
team, hardened runtime and increasing build, then invokes official generate_appcast.
It requires an external key file and writes a NEW local directory. Nothing uploads.
Keep signing keys outside the repository and hosting server.

No live feed, production signing identity, notarization profile, public upgrade,
or App Store distribution is established. Synthetic tests cannot establish these.
Official references: https://sparkle-project.org/documentation/ and
https://sparkle-project.org/documentation/publishing/.

Local preview builds compile the updater implementation out (no DIRECT_UPDATES
condition); the linker removes the unused Sparkle load command. This preserves
hardened runtime validation for ad-hoc builds instead of weakening it to load a
framework. The public packager enables the implementation only with
RIVUNE_ENABLE_DIRECT_UPDATES=1 plus RIVUNE_UPDATE_FEED_URL,
RIVUNE_UPDATE_PUBLIC_KEY and RIVUNE_UPDATE_TEAM_ID. It validates and writes these
public values before signing. Account service activation is separate and remains
disabled in this development configuration.

Verification: scripts/test_update_signatures.py uses an ephemeral file-based key
and official sign_update to accept a valid disposable archive and reject altered
bytes. It does not use Keychain, publish, or install anything. This is not a full
Sparkle installation test: incompatible versions, offline feeds, skip/later,
progress, interrupted download and signed relaunch still need end-to-end testing
with a provisioned release identity. Generated appcast output is a staged entry;
review/merge it with the published feed history before any separately authorized
publication.
