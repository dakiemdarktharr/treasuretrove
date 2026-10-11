# Verification — 12 October 2026

## Passed

- Production build on Windows and on Vercel.
- GitHub Actions: unit tests and production build.
- Dependency audit: zero reported vulnerabilities.
- Four unit tests for ID normalization, search, purpose grouping and quantity validation.
- Four local end-to-end scenarios with the actual Atlas database: account/session behavior; private parts and photos across two users; duplicate and image validation; concurrent stock deductions; metadata updates preserving stock; search-to-create; upload and clipboard paste; reload persistence; recovery/session revocation; logout.
- Visual review at 1440 × 960 of sign-in, the empty workbench, populated list, grid and detail panel.
- Staged source checked against the configured credentials before the public push. Local environment files and test artifacts excluded.
- Disposable test accounts and their parts/sessions removed after each end-to-end run.

## Deployment

- Public repository: https://github.com/dakiemdarktharr/treasuretrove
- Production URL: https://treasuretrove-tau.vercel.app
- Vercel project: `treasuretrove`, Hobby account; functions in Singapore (`sin1`).
- GitHub repository connected for subsequent deployments.
- MongoDB connection stored as a Vercel secret, never in the source repository.

## Outstanding live check

The production frontend responds, but account registration returns 503. Vercel logs show `MongoServerSelectionError`, while the same connection works locally. Atlas network access is the leading hypothesis, not yet confirmed. Inspection is pending the owner's Atlas sign-in. No Atlas network permissions have been changed.

After correcting the connection, run the same end-to-end suite against the production URL and verify it passes before considering the live inventory ready.
