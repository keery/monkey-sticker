#!/usr/bin/env python3
"""Compose la bannière hero de marque Monkey Sticker (logo + halo chaud sur vitrine de nuit)."""
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import os

SS = 2                      # supersampling pour l'antialiasing
W, H = 1280, 440
w, h = W * SS, H * SS

# --- Palette « vitrine de nuit » -------------------------------------------
INK_TOP    = (26, 19, 16)   # charbon chaud, haut
INK_BOT    = (10, 8, 7)     # plus sombre en bas
WARM_WHITE = (245, 239, 231)
GOLD       = (232, 176, 75)
MUTED      = (150, 138, 124)
HALO       = (235, 150, 58) # ambre du halo

def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/SFCompactRounded.ttf",
        "/System/Library/Fonts/SFNSRounded.ttf",
        "/System/Library/Fonts/Supplemental/Avenir Next.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

# --- Fond : dégradé vertical chaud -----------------------------------------
base = Image.new("RGB", (w, h))
px = base.load()
for y in range(h):
    t = y / (h - 1)
    r = round(INK_TOP[0] + (INK_BOT[0] - INK_TOP[0]) * t)
    g = round(INK_TOP[1] + (INK_BOT[1] - INK_TOP[1]) * t)
    b = round(INK_TOP[2] + (INK_BOT[2] - INK_TOP[2]) * t)
    for x in range(w):
        px[x, y] = (r, g, b)

# --- Halo chaud derrière le logo (lumière de galerie) ----------------------
logo_cx, logo_cy = int(0.20 * w), int(0.50 * h)
halo_r = int(0.42 * w)
grad = Image.radial_gradient("L").resize((halo_r * 2, halo_r * 2))
grad = ImageOps.invert(grad)                 # centre lumineux
grad = grad.point(lambda v: int((v / 255) ** 2.1 * 135))  # adoucir + plafonner
glow = Image.new("RGB", (halo_r * 2, halo_r * 2), HALO)
base.paste(glow, (logo_cx - halo_r, logo_cy - halo_r), grad)

# petit second halo, plus resserré et plus chaud, pile sur le logo
grad2 = ImageOps.invert(Image.radial_gradient("L")).resize((int(halo_r*1.1), int(halo_r*1.1)))
grad2 = grad2.point(lambda v: int((v / 255) ** 2.2 * 110))
glow2 = Image.new("RGB", grad2.size, (255, 196, 120))
base.paste(glow2, (logo_cx - grad2.size[0]//2, logo_cy - grad2.size[1]//2), grad2)

# --- Logo -------------------------------------------------------------------
logo = Image.open(os.path.join(os.path.dirname(__file__), "..", "logo-monkey-sticker.webp")).convert("RGBA")
target_h = int(0.62 * h)
target_w = round(logo.width * target_h / logo.height)
logo = logo.resize((target_w, target_h), Image.LANCZOS)
# ombre portée douce sous le logo
shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
shadow.paste((0, 0, 0, 150), (0, 0), logo.split()[3])
shadow = shadow.filter(ImageFilter.GaussianBlur(14 * SS))
base.paste(shadow, (logo_cx - target_w // 2 + 4 * SS, logo_cy - target_h // 2 + 10 * SS), shadow)
base.paste(logo, (logo_cx - target_w // 2, logo_cy - target_h // 2), logo)

# --- Vignette (coins assombris, ambiance) -----------------------------------
vig = Image.new("L", (w, h), 0)
vd = ImageDraw.Draw(vig)
vd.ellipse([-int(0.25*w), -int(0.35*h), int(1.25*w), int(1.35*h)], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(120 * SS))
dark = Image.new("RGB", (w, h), (6, 5, 4))
base = Image.composite(base, dark, vig)

# --- Texte ------------------------------------------------------------------
draw = ImageDraw.Draw(base)
tx = int(0.42 * w)

def text(x, y, s, font, fill, spacing=0, weight=0):
    if spacing == 0:
        draw.text((x, y), s, font=font, fill=fill,
                  stroke_width=weight, stroke_fill=fill)
        return
    cx = x
    for ch in s:
        draw.text((cx, y), ch, font=font, fill=fill,
                  stroke_width=weight, stroke_fill=fill)
        cx += draw.textlength(ch, font=font) + spacing

f_kicker = load_font(20 * SS)
f_word   = load_font(96 * SS)
f_tag    = load_font(30 * SS)

# kicker espacé
text(tx + 3 * SS, int(0.20 * h), "STICKERS FORMAT CARTE BANCAIRE",
     f_kicker, GOLD, spacing=6 * SS)
# wordmark sur deux lignes serrées
text(tx, int(0.255 * h), "Monkey",  f_word, WARM_WHITE, weight=SS)
text(tx, int(0.475 * h), "Sticker", f_word, GOLD, weight=SS)
# tagline
text(tx + 3 * SS, int(0.75 * h), "Rends ta carte bancaire unique.",
     f_tag, MUTED)

# --- Export -----------------------------------------------------------------
out = base.resize((W, H), Image.LANCZOS)
os.makedirs(os.path.join(os.path.dirname(__file__), "..", ".github"), exist_ok=True)
dest = os.path.join(os.path.dirname(__file__), "..", ".github", "banner.png")
out.save(dest, "PNG")
print("écrit:", os.path.normpath(dest), out.size)
