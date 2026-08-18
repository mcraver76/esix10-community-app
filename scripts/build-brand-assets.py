#!/usr/bin/env python3
"""Generate the ESix10 logo package.   python3 scripts/build-brand-assets.py

WHY THIS EXISTS
  One 1080x1080 file was doing five jobs: favicon, apple-touch-icon, three PWA
  icons, and the og:image behind every shared/invite link. Two things were wrong
  with using it that way:

  1. SHAPE. It is a transparent square whose artwork fills only the top ~62% —
     38% of the image is empty space at the bottom. Link previews want 1.91:1
     (1200x630), so platforms crop or letterbox that square and the logo lands
     small, off-centre or squashed. That is the distorted invite-link logo.

  2. COLOUR. The ESIX10 wordmark is drawn in solid BLACK, so the lockup only
     works on a light background — but the app, the manifest theme and every
     link-preview card here are near-black (#0A0A0A). On dark it reads as a
     ghostly outline. There was no dark-background version of the logo at all.

  Fix: derive a dark-background variant, trim the art to its real bounds, and
  compose every output at its own correct size and aspect ratio. Nothing is
  ever stretched — the aspect ratio is preserved in every single output.

  Small icons use the RHINO ONLY. At 192px the full lockup's "INITIATIVE" is an
  unreadable smudge; the mark alone stays legible.
"""
from PIL import Image

BG      = (10, 10, 10, 255)      # #0A0A0A — matches the manifest theme and the app
LOCKUP  = "assets/logo.png"      # rhino + ESIX10 + INITIATIVE, transparent, BLACK wordmark
MARK    = "assets/icon-only.png" # rhino alone, transparent
OUT     = "public"

def for_dark_bg(im):
    """Flip only the NEUTRAL pixels (the black wordmark and its anti-aliased edge)
    so the lettering reads on a dark background. Orange is left exactly alone:
    a pixel counts as neutral only when its channels are within 45 of each other,
    which the brand orange never is."""
    im = im.convert("RGBA").copy()
    px, (w, h) = im.load(), im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if max(r, g, b) - min(r, g, b) < 45:
                v = 255 - (r + g + b) // 3
                px[x, y] = (v, v, v, a)
    return im

def trimmed(im):
    return im.crop(im.getbbox())

def compose(art, W, H, coverage, by="width", bg=BG):
    """Centre `art` on a W x H brand-coloured canvas at `coverage` of the chosen
    dimension, preserving aspect ratio."""
    canvas = Image.new("RGBA", (W, H), bg)
    if by == "width":
        w = int(W * coverage); h = max(1, round(w * art.height / art.width))
    else:
        h = int(H * coverage); w = max(1, round(h * art.width / art.height))
    art = art.resize((w, h), Image.LANCZOS)
    canvas.paste(art, ((W - w) // 2, (H - h) // 2), art)
    return canvas

lockup_light = trimmed(Image.open(LOCKUP).convert("RGBA"))
lockup_dark  = trimmed(for_dark_bg(Image.open(LOCKUP)))
mark         = trimmed(Image.open(MARK).convert("RGBA"))
print(f"lockup {lockup_light.size}   mark {mark.size}")

def save(img, name):
    img.save(f"{OUT}/{name}", "PNG", optimize=True)
    print(f"  {name:26} {img.size[0]}x{img.size[1]}")

# Transparent lockup for the dark app UI. Deliberately kept on the ORIGINAL
# 1080x1080 canvas rather than trimmed: the app sizes these by height with
# width:auto, so a trimmed file would render the artwork about twice as large
# and shift every screen it appears on. This way the only thing that changes is
# the wordmark colour — a true drop-in. (esix10logo.png stays as the light-bg
# version, which is what the emails use.)
save(for_dark_bg(Image.open(LOCKUP)), "esix10logo-dark.png")

# Link preview. Fit by HEIGHT so the wide canvas keeps room either side.
save(compose(lockup_dark, 1200, 630, 0.58, by="height"), "og-image.png")

# PWA / home-screen icons.
save(compose(mark, 192, 192, 0.80), "icon-192.png")
save(compose(mark, 512, 512, 0.80), "icon-512.png")

# Maskable: Android crops to a circle, so the art must sit inside the central
# 80% safe zone. A 2.27:1 mark has to be smaller than it looks like it should be,
# or the horn and tail get clipped.
save(compose(mark, 512, 512, 0.62), "icon-maskable-512.png")

# iOS strips transparency and applies its own rounding.
save(compose(mark, 180, 180, 0.78), "apple-touch-icon.png")

save(compose(mark, 32, 32, 0.92), "favicon-32.png")
save(compose(mark, 16, 16, 0.96), "favicon-16.png")
compose(mark, 64, 64, 0.90).save(f"{OUT}/favicon.ico", sizes=[(16,16),(32,32),(48,48)])
print(f"  {'favicon.ico':26} 16/32/48")
