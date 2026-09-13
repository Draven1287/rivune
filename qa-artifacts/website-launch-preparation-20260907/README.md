# Website launch preparation

This directory contains local review tools and evidence only. Nothing here publishes, enables Pages, purchases hosting or modifies the shared native source.

`prepare_candidate.py` verifies each file in a frozen candidate's source manifest, checks out the named public base in a new temporary repository, adds only the website source and Pages workflow, and produces a binary-capable review patch. It refuses to replace existing public files automatically. It does not import the development checkout's untracked files or the prior publication checkout's staged additions.

## V3 rehearsal result

- Public base: `68747456c17692784ba0924fc9ed41392ce6c7af`.
- Exact scope: 17 website source files plus one workflow, 18 additions total.
- Independent reconstruction from a fresh archive: passed. All 111 pre-existing public files are unchanged; every added file matches the captured SHA-256.
- Preview build: passed with coming-soon metadata.
- Complete test suite: 20 passed, two failed out of 22. Both failures are obsolete blanket no-JavaScript assertions rejecting the accepted inline mobile-menu dismissal behavior. The publishing workflow runs the full suite, so V3 is not accepted for publication despite its earlier focused rendering acceptance.
- Exact receipt, patch, test output and build output are in `v3-rehearsal/`.

The website implementer received the reproduced failures and is correcting them in V4. Do not modify the frozen V3 source or publish this rehearsal patch.

## Next candidate

After V4 is frozen, supply its candidate directory and manifest to the preparer, with the current public base and reviewed workflow. Rerun the full tests and explicit preview build in the returned temporary checkout, reconstruct the patch independently, and compare source/dist hashes. Render the candidate on desktop and mobile, including menu, FAQ, image enlargement, keyboard focus and download/support routes.

The concrete source diff and rendered preview must be ready before the final publication decision. GitHub Pages is currently disabled. Enabling/deploying Pages and publishing an installer are separate subsequent actions; a source ZIP is never presented as a DMG.
