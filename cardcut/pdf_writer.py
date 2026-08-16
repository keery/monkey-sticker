"""Écriture PDF via reportlab — ton direct CutContour, overprint, y flippé.

C'est le SEUL module qui inverse l'axe y (le PDF a l'origine en bas à gauche).
La coupe est toujours dessinée EN DERNIER (au-dessus du visuel), en contour
sans fond, en surimpression — ce qu'attendent les RIP (VersaWorks & co).
"""

from __future__ import annotations

from pathlib import Path as FsPath

from reportlab.lib.colors import CMYKColorSep, black
from reportlab.pdfgen.canvas import Canvas

from . import MM_TO_PT
from .geometry import Close, CornerArc, LineTo, MoveTo, Path

KAPPA = 0.5522847498  # approximation d'un quart de cercle par une cubique de Bézier

# Alternate CMYK 0/100/0/0 (magenta) : convention habituelle pour CutContour
CUT_SPOT = CMYKColorSep(0, 1, 0, 0, spotName="CutContour", density=1)


def _pdf_path(c: Canvas, path: Path, page_h_mm: float):
    def pt(x_mm: float, y_mm: float) -> tuple[float, float]:
        return (x_mm * MM_TO_PT, (page_h_mm - y_mm) * MM_TO_PT)

    p = c.beginPath()
    cur = None
    for op in path.ops:
        if isinstance(op, MoveTo):
            p.moveTo(*pt(op.x, op.y))
            cur = (op.x, op.y)
        elif isinstance(op, LineTo):
            p.lineTo(*pt(op.x, op.y))
            cur = (op.x, op.y)
        elif isinstance(op, CornerArc):
            sx, sy = cur
            c1 = (sx + KAPPA * (op.cx - sx), sy + KAPPA * (op.cy - sy))
            c2 = (op.ex + KAPPA * (op.cx - op.ex), op.ey + KAPPA * (op.cy - op.ey))
            p.curveTo(*pt(*c1), *pt(*c2), *pt(op.ex, op.ey))
            cur = (op.ex, op.ey)
        elif isinstance(op, Close):
            p.close()
    return p


def write_pdf(out_path: FsPath, page_w_mm: float, page_h_mm: float,
              cut_paths: list[Path] = (), stroke_pt: float = 0.5,
              artwork_png: FsPath | None = None,
              black_elements: list[tuple] = (), title: str | None = None) -> None:
    """black_elements : ('path', Path, width_pt) ou ('text', x_mm, y_mm, size_pt, str).
    Ordre de peinture : artwork -> éléments noirs -> coupe spot (au-dessus)."""
    c = Canvas(str(out_path),
               pagesize=(page_w_mm * MM_TO_PT, page_h_mm * MM_TO_PT),
               pageCompression=0)  # flux lisibles -> self-check par lecture d'octets
    if title:
        c.setTitle(title)

    if artwork_png is not None:
        c.drawImage(str(artwork_png), 0, 0,
                    width=page_w_mm * MM_TO_PT, height=page_h_mm * MM_TO_PT,
                    preserveAspectRatio=False, mask=None)

    for el in black_elements:
        if el[0] == "path":
            _, path, width_pt = el
            c.setStrokeColor(black)
            c.setLineWidth(width_pt)
            c.drawPath(_pdf_path(c, path, page_h_mm), stroke=1, fill=0)
        elif el[0] == "text":
            _, x_mm, y_mm, size_pt, s = el
            c.setFillColor(black)
            c.setFont("Helvetica", size_pt)
            c.drawString(x_mm * MM_TO_PT, (page_h_mm - y_mm) * MM_TO_PT, s)

    if cut_paths:
        c.setStrokeColor(CUT_SPOT)
        c.setLineWidth(stroke_pt)
        c.setStrokeOverprint(True)  # /OP true
        if hasattr(c, "setOverprintMask"):
            c.setOverprintMask(True)  # /OPM 1
        for path in cut_paths:
            c.drawPath(_pdf_path(c, path, page_h_mm), stroke=1, fill=0)

    c.showPage()
    c.save()
