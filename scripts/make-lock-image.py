"""Erzeugt den unscharfen Statuenkopf für den Sperrbildschirm aus `assets/lock/statue.jpg`.

Gespiegelt (der Kopf steht links und schaut nach rechts zu „ORBIT“), in Graustufen, weichgezeichnet.
Unten läuft das Bild in den Hintergrund `colors.lock` aus, damit es am Handy ohne Kante endet.

Aufruf: python3 scripts/make-lock-image.py   (braucht Pillow: pip install pillow)
"""

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

LOCK = Path(__file__).resolve().parent.parent / "assets" / "lock"
BACKGROUND = 0xEC  # = colors.lock (#ECECEC) in src/theme.ts
BLUR = 14
FADE = 0.38  # unterer Anteil des Bildes, der in den Hintergrund ausläuft


def main() -> None:
    img = ImageOps.grayscale(ImageOps.mirror(Image.open(LOCK / "statue.jpg")))
    w, h = img.size

    # Weicher Übergang (Smoothstep) nach unten in die Hintergrundfarbe.
    mask = Image.new("L", (w, h), 0)
    start = round(h * (1 - FADE))
    for y in range(start, h):
        t = (y - start) / (h - start)
        mask.paste(round(255 * t * t * (3 - 2 * t)), (0, y, w, y + 1))
    img = Image.composite(Image.new("L", (w, h), BACKGROUND), img, mask)

    img = img.filter(ImageFilter.GaussianBlur(BLUR))
    img.save(LOCK / "statue-blur.jpg", quality=95, optimize=True, progressive=True)
    print(f"statue-blur.jpg {w}x{h}, {(LOCK / 'statue-blur.jpg').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
