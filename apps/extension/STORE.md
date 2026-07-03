# Chrome Web Store listing

Reference for the CWS dashboard submission. Not shipped in the extension.

## Package

- Build: `pnpm -F @clipped-page/extension zip`
- Artifact: `apps/extension/.output/clipped-pageextension-<version>-chrome.zip`
- Version lives in `apps/extension/package.json` (WXT reads it into the manifest).

## Listing fields

**Name:** clipped.page

**Summary** (max 132 chars):
Clip any post on x.com into a self-contained, shareable URL that renders anywhere, no account or app required.

**Category:** Productivity

**Language:** English

**Description:**

clipped.page turns any post on x.com into a single, self-contained URL.

Click the scissors button on a post and the entire post (text, author, images, and thread) is encoded directly into a clipped.page link. There is no database and no server-side storage: the post data is compressed and packed into the URL itself. Open that link and clipped.page renders the post as clean, readable HTML, no login and no app required.

The same URL also serves Markdown (`?f=md`) and JSON (`?f=json`) for agents and tooling.

Features:
- One-click clip button injected on x.com posts
- Configurable action: open the link, copy it, or both
- Full thread capture
- No account, no tracking, no data collection
- Open source

Source: https://github.com/zirkelc/clipped-page

**Privacy policy URL:** https://clipped.page/privacy

## Single purpose

Clip a post on x.com into a self-contained, shareable URL that renders the post without requiring an account or the original site.

## Permission justifications

- **activeTab** — read the DOM of the post the user is currently viewing, only when they click the clip button.
- **storage** — persist the user's clip-button action preference (open / copy / copy+open) via `chrome.storage.sync`.
- **host_permissions (https://x.com/*, https://twitter.com/*)** — inject the clip button into post pages so the user can clip in place.

## Data usage disclosures

- Does the extension collect user data? **No.** All post data is encoded client-side into the URL; nothing is sent to or stored on a server.
- Remote code: **No.** All code is bundled in the package.

## Assets (in `assets/store/` at the repo root)

All produced at exact CWS sizes via `assets/store/shot.mjs` (see its README):

- `hero.png` (1280×800) — screenshot: clean post card
- `quote.png` (1280×800) — screenshot: quoted-post card
- `image.png` (1280×800) — screenshot: post with images
- `thread.png` (1280×800) — screenshot: 9-post thread
- `landing.png` (1280×800) — screenshot: how it works
- `tile.png` (440×280) — small promo tile
- `marquee.png` (1400×560) — marquee promo (featured)
- Store icon 128×128 ships in the package (`public/icon/128.png`)

## Submitting (manual — needs your Google login)

1. Sign in at the CWS developer dashboard (publisher `e7c53128-ba46-4883-9ffb-ed583efe8a26`).
2. Upload `.output/clipped-pageextension-1.0.0-chrome.zip`.
3. Paste the listing fields above; upload screenshots + tiles from `assets/store/`.
4. Privacy policy URL: https://clipped.page/privacy
5. Fill single-purpose + permission justifications above; submit for review.
