"""Écriture SVG « ceinture et bretelles » pour Silhouette Studio.

Unité utilisateur = point (px@72dpi) : Studio (qui ignore les unités CSS et lit
le viewBox comme des px@72dpi) ET les lecteurs conformes (Illustrator, Inkscape,
navigateurs — qui honorent width en mm) obtiennent tous des cotes exactes.
Aucun transform, coordonnées absolues, tracés fermés.
"""

from __future__ import annotations

from pathlib import Path as FsPath

from . import MM_TO_PT
from .geometry import Close, CornerArc, LineTo, MoveTo, Path


def _pt(v_mm: float) -> str:
    return f"{v_mm * MM_TO_PT:.4f}"


def path_d(path: Path) -> str:
    parts = []
    for op in path.ops:
        if isinstance(op, MoveTo):
            parts.append(f"M {_pt(op.x)} {_pt(op.y)}")
        elif isinstance(op, LineTo):
            parts.append(f"L {_pt(op.x)} {_pt(op.y)}")
        elif isinstance(op, CornerArc):
            # Tracés construits en sens horaire (y vers le bas) => sweep = 1
            parts.append(f"A {_pt(op.r)} {_pt(op.r)} 0 0 1 {_pt(op.ex)} {_pt(op.ey)}")
        elif isinstance(op, Close):
            parts.append("Z")
    return " ".join(parts)


def path_el(path: Path, stroke: str = "#FF0000", width_pt: float = 0.709,
            dash: str | None = None, id_: str | None = None) -> str:
    id_attr = f' id="{id_}"' if id_ else ""
    dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<path{id_attr} d="{path_d(path)}" fill="none" stroke="{stroke}" '
            f'stroke-width="{width_pt:.3f}"{dash_attr}/>')


def rect_el(x: float, y: float, w: float, h: float, stroke: str = "#999999",
            width_pt: float = 0.5, dash: str | None = None, id_: str | None = None) -> str:
    id_attr = f' id="{id_}"' if id_ else ""
    dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect{id_attr} x="{_pt(x)}" y="{_pt(y)}" width="{_pt(w)}" height="{_pt(h)}" '
            f'fill="none" stroke="{stroke}" stroke-width="{width_pt:.3f}"{dash_attr}/>')


def text_el(x: float, y: float, size_pt: float, s: str, fill: str = "#555555") -> str:
    return (f'<text x="{_pt(x)}" y="{_pt(y)}" font-family="Helvetica, Arial, sans-serif" '
            f'font-size="{size_pt:.1f}" fill="{fill}">{s}</text>')


def write_svg(out_path: FsPath, page_w_mm: float, page_h_mm: float,
              layers: list[tuple[str, list[str]]]) -> None:
    """layers = liste ordonnée (id_calque, éléments déjà rendus). Le dernier
    calque est dessiné au-dessus."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{page_w_mm:.2f}mm" '
        f'height="{page_h_mm:.2f}mm" viewBox="0 0 {page_w_mm * MM_TO_PT:.4f} {page_h_mm * MM_TO_PT:.4f}">',
        f'<!-- cardcut - unite utilisateur = point (72 dpi) - 1 mm = {MM_TO_PT:.6f} unites -->',
        '<!-- Ne PAS re-enregistrer via Inkscape avant import Silhouette Studio (96 dpi -> erreur x0,75) -->',
    ]
    for layer_id, elements in layers:
        lines.append(f'<g id="{layer_id}">')
        lines.extend(f"  {el}" for el in elements)
        lines.append("</g>")
    lines.append("</svg>")
    FsPath(out_path).write_text("\n".join(lines) + "\n", encoding="utf-8")
