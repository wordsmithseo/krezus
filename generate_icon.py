#!/usr/bin/env python3
"""Generate luxurious gold-on-black Krezus app icon for all Android densities."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math

SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

RES_DIR = os.path.join(os.path.dirname(__file__), "android/app/src/main/res")

GOLD_LIGHT  = (255, 223, 100)
GOLD_MID    = (212, 175, 55)
GOLD_DARK   = (160, 120, 20)
BLACK_BG    = (8, 6, 4)
GOLD_BORDER = (200, 160, 40)


def gold_color(t):
    """Interpolate gold gradient for t in [0,1]."""
    if t < 0.5:
        r = int(GOLD_DARK[0] + (GOLD_MID[0] - GOLD_DARK[0]) * t * 2)
        g = int(GOLD_DARK[1] + (GOLD_MID[1] - GOLD_DARK[1]) * t * 2)
        b = int(GOLD_DARK[2] + (GOLD_MID[2] - GOLD_DARK[2]) * t * 2)
    else:
        r = int(GOLD_MID[0] + (GOLD_LIGHT[0] - GOLD_MID[0]) * (t - 0.5) * 2)
        g = int(GOLD_MID[1] + (GOLD_LIGHT[1] - GOLD_MID[1]) * (t - 0.5) * 2)
        b = int(GOLD_MID[2] + (GOLD_LIGHT[2] - GOLD_MID[2]) * (t - 0.5) * 2)
    return (r, g, b)


def draw_K(draw, cx, cy, size, scale):
    """Draw a stylized golden K letter using polygons."""
    s = scale
    stroke = max(2, int(size * 0.09))

    # Vertical bar of K
    x0 = cx - int(s * 0.22)
    x1 = cx - int(s * 0.08)
    top = cy - int(s * 0.38)
    bot = cy + int(s * 0.38)

    # Draw vertical bar with gradient
    for y in range(top, bot):
        t = (y - top) / max(1, bot - top)
        c = gold_color(t)
        draw.line([(x0, y), (x1, y)], fill=c, width=1)

    # Upper arm of K (diagonal going up-right)
    arm_top_x = cx + int(s * 0.28)
    arm_mid_x = cx + int(s * 0.02)
    arm_mid_y = cy - int(s * 0.02)

    for i in range(stroke * 2):
        offset = i - stroke
        pts = [
            (x1 + offset, arm_mid_y),
            (arm_mid_x + offset, arm_mid_y),
            (arm_top_x + offset, top),
            (arm_top_x + offset + stroke, top),
            (arm_mid_x + offset + stroke, arm_mid_y),
            (x1 + offset + stroke, arm_mid_y),
        ]
        t = (i) / max(1, stroke * 2)
        c = gold_color(0.3 + t * 0.7)
        draw.polygon(pts, fill=c)

    # Lower arm of K (diagonal going down-right)
    for i in range(stroke * 2):
        offset = i - stroke
        pts = [
            (x1 + offset, arm_mid_y),
            (arm_mid_x + offset, arm_mid_y),
            (arm_top_x + offset, bot),
            (arm_top_x + offset + stroke, bot),
            (arm_mid_x + offset + stroke, arm_mid_y),
            (x1 + offset + stroke, arm_mid_y),
        ]
        t = (i) / max(1, stroke * 2)
        c = gold_color(0.7 - t * 0.3)
        draw.polygon(pts, fill=c)

    # Redraw vertical bar on top for clean overlap
    for y in range(top, bot):
        t = (y - top) / max(1, bot - top)
        c = gold_color(t)
        draw.line([(x0, y), (x1, y)], fill=c, width=1)


def draw_border(draw, size, margin, color):
    """Draw rounded gold border."""
    r = int(size * 0.12)
    m = margin
    draw.rounded_rectangle([m, m, size - m, size - m], radius=r, outline=color, width=max(1, int(size * 0.025)))


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded black background
    r = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BLACK_BG)

    # Subtle radial glow in center
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx = cy = size // 2
    for ri in range(int(size * 0.45), 0, -1):
        alpha = int(18 * (1 - ri / (size * 0.45)))
        gd.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(180, 140, 20, alpha))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Gold border (outer)
    draw_border(draw, size, int(size * 0.04), GOLD_BORDER)
    # Gold border (inner, thinner)
    draw_border(draw, size, int(size * 0.09), (120, 90, 10))

    # Draw K
    scale = size * 0.36
    draw_K(draw, size // 2, size // 2, size, scale)

    # Shine highlight top-left
    shine = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shine)
    shine_r = int(size * 0.35)
    sd.ellipse([
        int(size * 0.1) - shine_r, int(size * 0.1) - shine_r,
        int(size * 0.1) + shine_r, int(size * 0.1) + shine_r
    ], fill=(255, 240, 160, 22))
    shine = shine.filter(ImageFilter.GaussianBlur(radius=size * 0.06))
    img = Image.alpha_composite(img, shine)

    return img


def make_square_icon(size):
    """Flat square version (no rounded corners) for adaptive icon foreground."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    scale = size * 0.32
    draw_K(draw, cx, cy, size, scale)
    return img


for density, px in SIZES.items():
    icon = make_icon(px)
    out_dir = os.path.join(RES_DIR, density)
    os.makedirs(out_dir, exist_ok=True)

    # Standard icon (square with rounded corners bg)
    flat = Image.new("RGB", (px, px), BLACK_BG)
    flat.paste(icon, mask=icon.split()[3])
    flat.save(os.path.join(out_dir, "ic_launcher.png"))

    # Round icon (circle mask)
    circle_mask = Image.new("L", (px, px), 0)
    ImageDraw.Draw(circle_mask).ellipse([0, 0, px - 1, px - 1], fill=255)
    round_img = Image.new("RGB", (px, px), BLACK_BG)
    round_img.paste(icon, mask=icon.split()[3])
    round_out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    round_out.paste(round_img, mask=circle_mask)
    round_bg = Image.new("RGB", (px, px), BLACK_BG)
    round_bg.paste(round_out, mask=round_out.split()[3])
    round_bg.save(os.path.join(out_dir, "ic_launcher_round.png"))

    # Foreground for adaptive icon (transparent bg, K only)
    fg = make_square_icon(px)
    fg.save(os.path.join(out_dir, "ic_launcher_foreground.png"))

    print(f"  {density}: {px}x{px} px — OK")

print("\nIkony wygenerowane pomyślnie!")
