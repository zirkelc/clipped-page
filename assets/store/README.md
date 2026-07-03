# Store assets

Art for the Chrome Web Store listing, checked into the repo. Regenerate with
headless Chrome via `shot.mjs`.

## Files

| File          | Size      | CWS slot                          |
| ------------- | --------- | --------------------------------- |
| `hero.png`    | 1280×800  | Screenshot — clean post card      |
| `quote.png`   | 1280×800  | Screenshot — quoted-post card     |
| `image.png`   | 1280×800  | Screenshot — post with images     |
| `thread.png`  | 1280×800  | Screenshot — 9-post thread        |
| `landing.png` | 1280×800  | Screenshot — how it works         |
| `tile.png`    | 440×280   | Small promo tile                  |
| `marquee.png` | 1400×560  | Marquee promo (featured listings) |

The `128×128` store icon is already in `apps/extension/public/icon/128.png`.

## Regenerate

```sh
# Card screenshots (payload -> clipped.page URL -> PNG)
node shot.mjs card hero.json
node shot.mjs card quote.json
node shot.mjs card image.json

# Thread screenshot (full clip URL saved in thread.url)
node shot.mjs urlfile thread.url thread.png

# Page screenshots
node shot.mjs url "https://clipped.page/" landing.png

# Branded art
node shot.mjs url "file://$PWD/tile.html"    tile.png    440 280
node shot.mjs url "file://$PWD/marquee.html" marquee.png 1400 560
```

`shot.mjs` reproduces the shared codec (json → gzip → base64url) with Node's
`zlib` so it can build a real clip URL without a browser, then renders it with
headless Chrome at an exact pixel size.

The `*.json` files are real posts (Matt Pocock, @mattpocockuk) and `thread.url`
is a real 9-post thread (Colin McDonnell, @colinhacks), both captured with the
extension. Swap them to refresh the screenshots.
