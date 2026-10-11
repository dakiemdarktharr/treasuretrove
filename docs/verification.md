# Verification — 12 October 2026

## Visual redesign

The new open shelf removes the sidebar and photo frames. A horizontal purpose rail, Bricolage Grotesque / DM Mono typography, original Bauhaus-inspired mark and symbols, warm printed colors, and an original interactive exploded IC replace the first interface. Motion animates filtering, the shared part picture and quantity changes; Anime.js animates the IC layers and traces. The centered inspector includes zoom and pointer panning. Reduced motion and keyboard interactions are supported.

Local verification: production build and TypeScript passed; four unit tests passed; **five end-to-end scenarios passed in 32.3 seconds**. Added coverage checks transparent WebP alpha, borderless pictures, absence of a sidebar, purpose filtering and cross-group search, zero-stock controls, view preference persistence, photo zoom, the exploded drawing in both directions, keyboard shortcuts, reduced motion and narrow-screen overflow. Browser page errors: none. Populated visual review used eight original illustrated fixtures in disposable test accounts.

Reference-to-implementation decisions are documented in [redesign.md](redesign.md).

Production deployment `dpl_GdjeUVbtYFT3VYrpNxtDWFtrhFXF` is ready at the existing public URL. The complete five-scenario suite passed against production in **31.2 seconds**, with no browser page errors. The implementation commit's GitHub checks passed and the production dependency audit reports zero vulnerabilities.

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

## Live verification completed

Atlas initially permitted only the owner's computer IP, preventing Vercel from connecting. With explicit owner approval, the `0.0.0.0/0` IP access rule was added for Vercel's dynamic outbound addresses. Atlas reported the rule as Active. Database credentials and TLS remain required.

The complete end-to-end suite then ran against `https://treasuretrove-tau.vercel.app`: **4 passed in 14.4 seconds**. This exercised production functions and the actual Atlas database, including registration, 30-day remembered-session cookies, non-remembered sessions, two-account isolation, private images, image validation, duplicate IDs, simultaneous stock deductions, cross-origin mutation rejection, search-to-create, upload, clipboard paste, stock updates, persistence across sessions, recovery and logout.

The test accounts, their sessions and their parts were removed by the suite's cleanup. No production connection blocker remains.
