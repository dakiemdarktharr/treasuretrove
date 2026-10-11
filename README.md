# TreasureTrove

A personal workbench for electronic components. Search for a part by ID, name, type or purpose. If it is missing, create it with a picture and quantity. Keep each user's collection private, organized and available on every signed-in device.

## Features

- Email/password accounts, optional 30-day remembered sessions and recovery keys.
- Required part ID, picture and whole-number quantity. Names, type, purpose, location and notes are optional.
- Upload, drop or paste pictures; images are resized and re-encoded as WebP.
- Purpose groups suggested from usage, with manual overrides.
- Search across groups, exact-ID ranking, stock filters, sorting, list and picture views.
- One-click stock changes and bulk add/use controls. Zero-stock components remain in the collection.
- Private component URLs and images. Accounts may use the same part ID without sharing stock.
- Desktop-first schematic-inspired light theme, local fonts, keyboard shortcuts and reduced-motion support.

## Run locally

Requires Node.js 22 or 24 and MongoDB Atlas (or a compatible MongoDB deployment).

```sh
npm ci
# Copy .env.example to .env.local and fill in MONGODB_URI.
npm run dev
```

Open http://localhost:3000 and create an account. Save the recovery key: it replaces an email-based password reset. Email ownership verification and transactional email are not configured.

| Variable      | Purpose                                    |
| ------------- | ------------------------------------------ |
| `MONGODB_URI` | Server-only database connection string     |
| `MONGODB_DB`  | Database name, defaults to `treasuretrove` |

Never commit `.env.local`. The app does not expose the connection string in browser code.

## Data and authentication

MongoDB stores `users`, `sessions`, `parts`, and expiring `limits` records. Parts and their image bytes share one document with a server-assigned `ownerId`. All list, update, deletion and image requests use the signed-in owner's ID in their database filters. A unique compound owner/normalized-ID index prevents duplicates within an account.

Passwords use salted scrypt hashes. Random session tokens are hashed in the database and delivered through HTTP-only, SameSite cookies, secure on production HTTPS. Remembered sessions last 30 days; other sessions expire after 12 hours and use a browser-session cookie. Recovery rotates the recovery key and revokes previous sessions. Authentication is rate-limited. Mutation endpoints validate the request origin and input. Stock uses atomic increments with bounds checks, without recording a stock history.

Images are stored in MongoDB to avoid a separate paid image service. Browser uploads accept JPG, PNG or WebP up to 15 MB and resize before transfer. The server validates and recompresses images, with a 1 MB stored-image limit. Free database storage and hosting quotas still apply; no paid add-ons are required by this code. Atlas network access must allow the deployed application's connections.

Inventory refreshes on window focus and every 15 seconds while visible. Stock writes are immediate; other devices see changes on their next refresh.

## Validate

```sh
npm test
npm run typecheck
npm run build
# Start the app separately, then:
npm run test:e2e
```

End-to-end tests require the configured database. They create identifiable disposable accounts and remove their accounts, sessions and parts afterward. They cover ownership isolation, private images, stock concurrency, duplicates, image requirements, upload/paste, search-to-create, persistence, recovery and logout. The default browser is installed Microsoft Edge; set `PLAYWRIGHT_CHANNEL=chrome` for Chrome. Set `TEST_BASE_URL` to test a deployment you own.

## Deploy

Import this repository into Vercel as a Next.js project. Set `MONGODB_URI` as a production secret and `MONGODB_DB=treasuretrove`. The app uses the Node.js runtime in Singapore (`sin1`). GitHub pushes can trigger deployments once the repository is connected. Use an isolated database for previews if sharing preview access.

The [design and UX notes](docs/design.md) document the research, UI references and design choices.
