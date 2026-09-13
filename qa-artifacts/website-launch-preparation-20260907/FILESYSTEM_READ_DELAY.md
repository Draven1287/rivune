# Source-read delay diagnosed

September 7, 2026. This is a local filesystem availability issue, not evidence that a website or app test failed.

`ls -lO@` reports multiple V4 candidate source files as `compressed,dataless`, including the 12,878-byte `site/build.py`. A diagnostic unbuffered Python reader prints `reading build.py` and then waits; metadata queries return immediately. The resident copy of that same file in the independently reviewed temporary materialization is not dataless and reads normally.

The exact storage provider and reason for eviction have not been diagnosed. No cloud settings, file-provider settings or storage preferences were changed. No source file was overwritten to force recovery.

## Available verified copies

- Reviewed source and built preview: `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-website-v4-contact-bcu8ugiv/site`.
- Final 18-file website integration: `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-pages-integration-8j13z_n0/repo`.
- The final integration was rechecked after diagnosing the delay: all 18 source/workflow files match `v4-integration/integration.json`. Its patch, 22-test suite, preview build and independent reconstruction already passed.

The website owner and app audit hub were notified. Final owner/source comparison remains pending; do not reinterpret a filesystem read timeout as a failed test or a terminated task. Prefer a verified resident materialization while preserving the recorded source hashes.

Outstanding root read sessions are 28398 (source hash comparison), 15758 (artifact enumeration/read), and 81094 (diagnostic reader). Resume their existing handles; do not start equivalent comparisons while they await filesystem data. Local preview session 4439 serves only the reviewed static website at http://127.0.0.1:57036/rivune/.
