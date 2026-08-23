"""
Genera los iconos PWA (PNG) a partir de icons/icon.svg (el logo definitivo:
dos flashcards con "Ab"). Necesita svglib + reportlab + pycairo/rlPyCairo
para rasterizar SVG -- a diferencia del resto de la app, esto SI requiere
dependencias externas de Python:

    pip install svglib reportlab pycairo rlPyCairo pillow

Uso: python tools/generate_icons.py
Salida:
  icons/icon-192.png, icons/icon-512.png   (purpose "any", fondo
    transparente fuera de la forma squircle -- el mismo dibujo que
    icon.svg, solo rasterizado a distintos tamanos)
  icons/icon-maskable-512.png              (purpose "maskable", fondo
    solido de borde a borde -- el sistema operativo aplica su propia
    mascara -- con el dibujo escalado al 72% y centrado para que quepa
    en la "safe zone" sin importar la forma que use cada launcher)
"""
from pathlib import Path

from reportlab.graphics import renderPM
from reportlab.lib.colors import Color
from svglib.svglib import svg2rlg

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "icons"
SRC = ICONS / "icon.svg"
TRANSPARENT = Color(0, 0, 0, 0)

MASKABLE_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#262624"/>
  <g transform="translate(512,512) scale(0.72) translate(-512,-512)">
    <g transform="translate(-14,52)">
      <rect x="239" y="194" width="630" height="450" rx="44" fill="none" stroke="#FAF9F5" stroke-width="18" opacity="0.55" transform="rotate(8 554 419)"/>
      <rect x="179" y="284" width="630" height="450" rx="44" fill="#D97757" transform="rotate(-6 494 509)"/>
      <text x="494" y="584" text-anchor="middle" font-family="'DejaVu Sans', Arial, sans-serif" font-weight="700" font-size="300" fill="#262624" transform="rotate(-6 494 509)">Ab</text>
    </g>
  </g>
</svg>
"""


def render_svg_file(svg_path, out_path, size, transparent=False):
    drawing = svg2rlg(str(svg_path))
    dpi = 72 * (size / drawing.width)
    kwargs = {"fmt": "PNG", "dpi": dpi}
    if transparent:
        kwargs.update(bg=TRANSPARENT, backendFmt="RGBA")
    renderPM.drawToFile(drawing, str(out_path), **kwargs)
    print(f"  -> {out_path.relative_to(ROOT)} ({size}x{size})")


def main():
    render_svg_file(SRC, ICONS / "icon-192.png", 192, transparent=True)
    render_svg_file(SRC, ICONS / "icon-512.png", 512, transparent=True)

    maskable_src = ICONS / "_maskable_source.svg"
    maskable_src.write_text(MASKABLE_SVG, encoding="utf-8")
    render_svg_file(maskable_src, ICONS / "icon-maskable-512.png", 512, transparent=False)
    maskable_src.unlink()


if __name__ == "__main__":
    main()
