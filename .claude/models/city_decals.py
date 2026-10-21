# Decal texture for the owner's car (run with system Python + Pillow): the windshield banner.
# Plain lettering in the spirit of the sticker in the photos, not brand artwork.
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'decals')
os.makedirs(OUT, exist_ok=True)
F = 'C:/Windows/Fonts/'


def fit(draw, text, font_file, box_w, box_h):
    """Largest font size whose text fits box_w x box_h."""
    size = box_h
    while size > 6:
        f = ImageFont.truetype(F + font_file, size)
        l, t, r, b = draw.textbbox((0, 0), text, font=f)
        if r - l <= box_w and b - t <= box_h: return f, (l, t, r, b)
        size -= 2
    return f, draw.textbbox((0, 0), text, font=f)


# Windshield banner: 0.92 m x 0.065 m, white
W, H = 1840, 130
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
f, (l, t, r, b) = fit(d, 'JDM  POWER', 'impact.ttf', W - 40, H - 20)
d.text(((W - (r - l)) / 2 - l, (H - (b - t)) / 2 - t), 'JDM  POWER', font=f, fill=(245, 245, 245, 235))
im.save(os.path.join(OUT, 'windshield_banner.png'))
print('decals ->', OUT)
