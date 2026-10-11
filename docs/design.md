# TreasureTrove design & UX decisions

Desktop workbench, not a marketing landing page. The search field is the main entry point. An inventory sheet occupies the centre; purpose groups form a quiet left rail. Selecting a component opens its photo and quantity controls in a detail panel, with a shareable authenticated URL.

## Tokens

- Paper #f8fafc; surface #ffffff; graphite #172b42; secondary #586b7e; trace #dbe4ed; cobalt #245bdb.
- Space Grotesk for the wordmark and display; IBM Plex Sans for controls; IBM Plex Mono for part identifiers and quantities. Fonts are served locally.
- 240px navigation, a generous main workspace, 112px search area, 76px inventory rows, 520px detail panel.
- Schematic corners, connection points and a restrained grid have a direct relationship to electronics. No scrolling effects that interfere with working through inventory.

Plan critique: the first concept used dashboard statistic cards; these were removed because they displace the search and add no useful action. Inventory totals appear as a compact sentence. A table enables comparison and direct quantity changes, while pictures preserve recognition. Motion is confined to opening panels and confirming actions; reduced-motion preferences are respected.

## Research and application

1. [Baymard: search query types](https://baymard.com/research-articles/ecommerce-search-query-types). Users search known items by name or model number and also search by type. Application: partial, case-insensitive search across ID, name, type and purpose; punctuation-insensitive ID matching; exact IDs rank first. Search is global so a category filter cannot make an existing part appear missing.
2. [NN/g: website forms](https://www.nngroup.com/articles/web-form-design/). Keep forms short, label fields, distinguish optional inputs, preserve values on error. Application: ID, quantity, picture are required; optional metadata lives under a disclosure. Search text pre-fills the ID. Upload, drop and paste share the same preview and validation path.
3. [NN/g: usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/). Application: named controls, stock feedback, recoverable errors, confirmation before deletion, quantities never below zero. Zero-stock items remain discoverable.
4. [W3C: modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Application: native modal dialogs trap focus, support Escape and return focus on close; fields have accessible labels. Search results are announced without moving focus.
5. [Motion: shared-layout modal](https://motion.dev/examples/vue-modal-shared-layout), [app folder](https://motion.dev/examples/react-ios-app-folder), [add to basket](https://motion.dev/examples/js-add-to-basket). Inspiration: compact panel entrances and numeric feedback. Implementation uses the free Motion package and CSS, not paid example source. Decorative typewriter/scramble text is omitted from functional IDs to keep them readable.

The supplied U.I LIB.txt was treated as a list of component-library references. Custom lightweight components and native browser semantics fit the brief without combining multiple large UI kits.

## Data ownership

[MongoDB multi-tenant guidance](https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/) supports records with tenant identifiers. One database contains users, sessions, parts and short-lived rate-limit records. Each part (including its image) has an immutable owner ID set from the server session. Every read/write/photo request includes that owner in the database filter. The client never chooses an owner. A compound unique index prevents duplicate part IDs within one account while allowing the same ID for different accounts.

## Verification plan

Check the actual flows: empty inventory, failed search, image upload/paste, duplicate ID, invalid quantity, zero stock, quick adjustments, refresh persistence, second-device login, remembered versus session cookies, logout invalidation, two-account isolation including images, expired sessions, and reduced-motion/keyboard dialog use. Research informs the design; usability with the owner's real inventory remains to be observed.
