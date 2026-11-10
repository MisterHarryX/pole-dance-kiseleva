"""Builds web photos from _source/ into public/photos/ (webp, full and small sizes) and the OG card."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '_source'
OUT = ROOT / 'public' / 'photos'
OUT.mkdir(parents=True, exist_ok=True)

# source file -> web name
PHOTOS = {
    '1.webp': 'flag',          # горизонтальный флажок
    '2.webp': 'inverted',      # вис вниз головой
    '3.webp': 'lean',          # прогиб у пилона
    '4.webp': 'crouch',        # присед-вис
    '5.webp': 'white',         # белый образ
    '6.webp': 'lean-red',      # прогиб, цвет
    '7.webp': 'crouch-red',    # присед-вис, цвет
    '8.webp': 'split',         # шпагат вниз головой
    '9.webp': 'entrance',      # вход, неон
    '10.webp': 'hall-1',
    '11.webp': 'hall-2',
    '12.webp': 'hall-neon-v',
    '13.webp': 'hall-neon',
    '14.webp': 'hall-3',
    '15.webp': 'hall-4',
    '16.webp': 'hall-day',
    'photo_2026-11-09_17-06-58.jpg': 'promo-trial',
    'photo_2026-11-09_17-07-00.jpg': 'promo-friend',
}

for src, name in PHOTOS.items():
    im = Image.open(SRC / src).convert('RGB')
    im = ImageOps.exif_transpose(im)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=82, method=6)
    small = im.copy()
    small.thumbnail((640, 640), Image.LANCZOS)
    small.save(OUT / f'{name}-sm.webp', 'WEBP', quality=78, method=6)
    print(name, im.size, '->', small.size)

# OG card 1200x630: graphite, photo on the right, gold wordmark on the left.
W, H = 1200, 630
og = Image.new('RGB', (W, H), (16, 16, 18))
ph = Image.open(SRC / '1.webp').convert('L')
ph = ImageOps.fit(ph, (720, H), centering=(0.55, 0.5))
ph = ImageOps.colorize(ph, (12, 12, 14), (236, 230, 218))
mask = Image.linear_gradient('L').rotate(90).resize((720, H))
mask = mask.point(lambda v: min(255, int(v * 2.2)))
og.paste(ph, (W - 720, 0), mask)
d = ImageDraw.Draw(og)
def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default()
serif = font(['C:/Windows/Fonts/georgia.ttf', 'C:/Windows/Fonts/times.ttf'], 84)
sans = font(['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'], 30)
gold = (214, 182, 116)
d.line([(96, 90), (96, 540)], fill=gold, width=4)
d.text((130, 170), 'Pole Dance', font=serif, fill=(240, 236, 228))
d.text((130, 262), 'Kiseleva', font=serif, fill=gold)
d.text((132, 390), 'Студия танцев на пилоне', font=sans, fill=(200, 198, 194))
d.text((132, 436), 'Москва · м. Новогиреево', font=sans, fill=(150, 148, 144))
og.save(ROOT / 'public' / 'og.jpg', 'JPEG', quality=86)
print('og.jpg')
