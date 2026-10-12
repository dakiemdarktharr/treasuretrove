# Verification — 12 October 2026

## Component catalog update

- Production build and TypeScript pass.
- Five unit tests pass: ID normalization, search, precise component classification, legacy-group compatibility, quantity validation.
- Five end-to-end scenarios pass locally in 46.9 seconds against the actual Atlas database. No browser page errors.
- 56 illustrated groups across eight families; four full poster frames visible on desktop. Fourteen optimized WebP atlases, about 5 MB total.
- No seeded parts, old chip illustration, sidebar, slogan or bordered part pictures.

## Exercised behavior

1. Email/password login, remembered and session-only cookies, two-account ownership isolation, private images, duplicate IDs, required images, malformed images, whole-number validation and cross-origin mutation rejection.
2. Concurrent stock deductions stop at zero; metadata edits cannot overwrite stock.
3. Search-to-create, required-picture error, upload, clipboard paste, bulk use, reload persistence and independent authenticated sessions.
4. Recovery rotates the key and revokes old sessions; logout revokes the current session.
5. Empty home, all 56 groups, four visible posters, drag without accidental clicks, arrow-key navigation, group search without saved parts, transparent stored images, borderless photos, hiding header, image zoom, stock arcs, nested Esc, exact home scroll restoration, pixel home, nested scroll-lock cleanup, footer reveal, group selector, runtime reduced-motion change, zero-stock controls, remembered list view and narrow-screen overflow.

Browser review covered the top-of-page composition, group overlay and lower families/footer. Reduced-motion handling uses an OS preference subscription, so it updates while the app is open. Esc pressed during a curtain is queued for the newly opened dialog.

All end-to-end fixtures belong to uniquely named disposable test accounts. The suite deletes their parts, sessions and accounts after running; it never inserts examples into a real user's inventory. Source artwork is documented in [poster-sources.json](poster-sources.json), and reference-to-implementation decisions in [redesign.md](redesign.md).

## Deployment

- Public repository: https://github.com/dakiemdarktharr/treasuretrove
- Production URL: https://treasuretrove-tau.vercel.app
- Vercel Hobby project `treasuretrove`, functions in Singapore (`sin1`).
- Server-only MongoDB credentials remain in local/Vercel environment variables.
- The owner-approved Atlas network rule is active; authentication and TLS remain required.

Production verification for this catalog revision is recorded after deployment.
