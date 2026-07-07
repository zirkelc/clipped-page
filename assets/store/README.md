# Store assets

Art for the Chrome Web Store listing, checked into the repo. The five
screenshots share one layout: a dark 1280×800 canvas with a descriptive header
above framed content. Regenerate with headless Chrome via the scripts below.

## Files

| File              | Size      | CWS slot                                    |
| ----------------- | --------- | ------------------------------------------- |
| `clip.png`        | 1280×800  | Screenshot — clip button in X's action bar  |
| `single.png`      | 1280×800  | Screenshot — a post rendered as a card      |
| `formats.png`     | 1280×800  | Screenshot — same link, card + Markdown     |
| `thread.png`      | 1280×800  | Screenshot — full thread capture with image |
| `landing.png`     | 1280×800  | Screenshot — how it works                   |
| `icon-128.png`    | 128×128   | Store icon                                  |
| `tile.png`        | 440×280   | Small promo tile                            |
| `marquee.png`     | 1400×560  | Marquee promo (featured listings)           |
| `social.png`      | 1280×640  | GitHub repo social preview (Settings)       |

## Regenerate

```sh
# Single-post + thread cards (live clipped.page renders in the header layout)
node store-shots.mjs         # -> single.png, thread.png

# Same link, every format (rendered card + ?f=md Markdown)
node formats-store.mjs       # -> formats.png

# Clip button, cropped from a real X-page screenshot (edit the crop rect / SRC
# path in the script to point at your own capture)
node clip-real.mjs           # -> clip.png

# Landing page
node shot.mjs url "https://clipped.page/" landing.png

# Branded promo art
node shot.mjs url "file://$PWD/tile.html"    tile.png    440 280
node shot.mjs url "file://$PWD/marquee.html" marquee.png 1400 560
node shot.mjs url "file://$PWD/social.html"  social.png  1280 640
```

`store-shots.mjs` / `formats-store.mjs` iframe the live clipped.page renders of
`jarred.url` and `thread.url` (a real post and a real thread captured with the
extension). `shot.mjs` reproduces the shared codec (json → gzip → base64url)
with Node's `zlib` so it can build a clip URL without a browser. The `128×128`
store icon is a copy of `apps/extension/public/icon/128.png`.
