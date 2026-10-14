"""Erzeugt die App-Icons aus den Design-Tokens (graue Tagesbänder + orange Checkbox).

Aufruf: python3 scripts/make-icons.py   (braucht Pillow: pip install pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
DAYS = ["#DBDBDB", "#D4D4D4", "#CDCDCD", "#C4C4C4", "#B7B7B7", "#AAAAAA", "#9D9D9D"]
ACCENT = "#E4642B"
SS = 4  # Supersampling für glatte Kanten


def bands(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), DAYS[-1])
    draw = ImageDraw.Draw(img)
    for i, color in enumerate(DAYS):
        top = round(i * size / len(DAYS))
        bottom = round((i + 1) * size / len(DAYS))
        draw.rectangle([0, top, size, bottom], fill=color)
    return img


def checkbox(size: int, box: float, color: str, tick: str | None) -> Image.Image:
    """Abgerundetes Quadrat mit Häkchen, zentriert. `tick=None` stanzt das Häkchen aus (für Monochrom)."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    b = box * s
    x0, y0 = (s - b) / 2, (s - b) / 2
    draw.rounded_rectangle([x0, y0, x0 + b, y0 + b], radius=b * 0.22, fill=color)
    points = [(x0 + b * 0.27, y0 + b * 0.52), (x0 + b * 0.44, y0 + b * 0.68), (x0 + b * 0.74, y0 + b * 0.34)]
    width = round(b * 0.11)
    tick_fill = tick if tick else (0, 0, 0, 0)
    draw.line(points, fill=tick_fill, width=width, joint="curve")
    for px, py in (points[0], points[-1]):
        r = width / 2
        draw.ellipse([px - r, py - r, px + r, py + r], fill=tick_fill)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    # iOS / allgemeines Icon: Bänder mit Checkbox, ohne Transparenz.
    icon = bands(1024).convert("RGBA")
    icon.alpha_composite(checkbox(1024, 0.36, ACCENT, "#FFFFFF"))
    icon.convert("RGB").save(ASSETS / "icon.png")

    # Android Adaptive Icon: Hintergrund und Vordergrund getrennt (Vordergrund im sicheren Bereich).
    bands(512).save(ASSETS / "android-icon-background.png")
    checkbox(512, 0.30, ACCENT, "#FFFFFF").save(ASSETS / "android-icon-foreground.png")
    checkbox(432, 0.36, "#FFFFFF", None).save(ASSETS / "android-icon-monochrome.png")

    # Browser-Tab
    icon.convert("RGB").resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")

    # Splash: nur die Checkbox, der Hintergrund kommt aus app.json.
    checkbox(1024, 0.5, ACCENT, "#FFFFFF").save(ASSETS / "splash-icon.png")


if __name__ == "__main__":
    main()
