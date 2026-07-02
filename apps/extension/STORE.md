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

## Assets still needed (manual)

- At least 1 screenshot, 1280×800 or 640×400 PNG/JPEG (extension in action on an x.com post)
- Optional small promo tile, 440×280
- Store icon 128×128 is already in the package (`public/icon/128.png`)
