# clipped.page

Clip an X (Twitter) post and share it as a single URL whose query string contains the entire post. Anyone (or any AI) opening the link receives the post's text, author, images, videos, and timestamp without needing X API access.

## Layout

```
apps/
  web/         Cloudflare Worker that renders clipped URLs as cards / markdown / JSON
  extension/   Chrome extension (MV3) that injects ✂️ on every X post
packages/
  shared/      Payload schema, codec, format converters
```

## Quick start

```sh
pnpm install
pnpm -F @clipped-page/shared test
pnpm -F @clipped-page/web dev          # http://localhost:8787
pnpm -F @clipped-page/extension dev    # then load apps/extension/.output/chrome-mv3
```

## URL format

```
https://clipped.page/?v=1&s=<host+path of source post>&d=<base64url(gzip(JSON))>
```

Content negotiation:

| `Accept` / `?f=`               | Response                |
|--------------------------------|-------------------------|
| (default, browsers)            | `text/html` ASCII card  |
| `text/markdown`, `?f=md`       | Markdown                |
| `application/json`, `?f=json`  | JSON payload            |
| `text/plain`                   | Plain text              |

## Production deploy

```sh
pnpm -F @clipped-page/web run deploy
```

`wrangler.toml` declares `clipped.page` + `www.clipped.page` as custom-domain routes, so deploy publishes both.
