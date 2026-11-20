"""Splits leteski-logo-mark.png into three same-size layers (left person, spark, right person)
for the animated intro screen. Run: python3 expo/scripts/split-logo.py"""
from PIL import Image
import os

here = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
src = Image.open(os.path.join(here, 'leteski-logo-mark.png')).convert('RGBA')
w, h = src.size
layers = {k: Image.new('RGBA', (w, h), (0, 0, 0, 0)) for k in ('left', 'spark', 'right')}
px = src.load()
out = {k: v.load() for k, v in layers.items()}

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        # Clearly blue/purple pixels belong to a person; everything else (orange,
        # yellow, white glints) belongs to the spark.
        if not (b > r + 25 and b > g + 25):
            out['spark'][x, y] = (r, g, b, a)
        elif x < w // 2:
            out['left'][x, y] = (r, g, b, a)
        else:
            out['right'][x, y] = (r, g, b, a)

for k, im in layers.items():
    im.save(os.path.join(here, f'intro-{k}.png'), optimize=True)
    print('saved', k)
