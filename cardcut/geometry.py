"""Géométrie neutre en mm — source unique des tracés, partagée par les writers.

Un Path est une suite d'opérations absolues, sans transform. Les rectangles
arrondis sont construits en sens horaire (repère y vers le bas), ce qui fixe
le sweep flag SVG à 1 pour tous les arcs de coin.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import PoseSpec


@dataclass(frozen=True)
class MoveTo:
    x: float
    y: float


@dataclass(frozen=True)
class LineTo:
    x: float
    y: float


@dataclass(frozen=True)
class CornerArc:
    """Arc de 90° d'un coin arrondi, du point courant vers (ex, ey).
    (cx, cy) = sommet du coin non arrondi (sert aux contrôles de Bézier
    côté PDF et au bbox exact), r = rayon."""

    r: float
    cx: float
    cy: float
    ex: float
    ey: float


@dataclass(frozen=True)
class Close:
    pass


@dataclass(frozen=True)
class Path:
    ops: tuple

    def translated(self, dx: float, dy: float) -> "Path":
        out = []
        for op in self.ops:
            if isinstance(op, MoveTo):
                out.append(MoveTo(op.x + dx, op.y + dy))
            elif isinstance(op, LineTo):
                out.append(LineTo(op.x + dx, op.y + dy))
            elif isinstance(op, CornerArc):
                out.append(CornerArc(op.r, op.cx + dx, op.cy + dy, op.ex + dx, op.ey + dy))
            else:
                out.append(op)
        return Path(tuple(out))

    def bbox(self) -> tuple[float, float, float, float]:
        """(xmin, ymin, xmax, ymax). Les sommets de coin (cx, cy) bornent
        exactement un rectangle arrondi — le bbox est donc exact."""
        xs, ys = [], []
        for op in self.ops:
            if isinstance(op, (MoveTo, LineTo)):
                xs.append(op.x)
                ys.append(op.y)
            elif isinstance(op, CornerArc):
                xs.extend((op.cx, op.ex))
                ys.extend((op.cy, op.ey))
        return (min(xs), min(ys), max(xs), max(ys))


def rounded_rect(x: float, y: float, w: float, h: float, r: float) -> Path:
    """Rectangle arrondi fermé, sens horaire, départ en haut à gauche après le coin."""
    if r < 0:
        raise ValueError(f"rayon négatif: {r}")
    if r > min(w, h) / 2 + 1e-9:
        raise ValueError(f"rayon {r} > moitié du petit côté ({min(w, h) / 2})")
    return Path((
        MoveTo(x + r, y),
        LineTo(x + w - r, y),
        CornerArc(r, x + w, y, x + w, y + r),
        LineTo(x + w, y + h - r),
        CornerArc(r, x + w, y + h, x + w - r, y + h),
        LineTo(x + r, y + h),
        CornerArc(r, x, y + h, x, y + h - r),
        LineTo(x, y + r),
        CornerArc(r, x, y, x + r, y),
        Close(),
    ))


def rect_path(x: float, y: float, w: float, h: float) -> Path:
    """Rectangle droit fermé, sens horaire (témoin, cadres)."""
    return Path((
        MoveTo(x, y),
        LineTo(x + w, y),
        LineTo(x + w, y + h),
        LineTo(x, y + h),
        Close(),
    ))


def pose_paths(pose: PoseSpec, ox: float, oy: float) -> list[Path]:
    """Tracés de coupe d'une pose : [contour carte, fenêtre puce éventuelle].
    (ox, oy) = position du coin haut-gauche de la CARTE sur la page."""
    card = pose.card
    paths = [rounded_rect(ox, oy, card.width, card.height, card.corner_radius)]
    if pose.window is not None:
        w = pose.window
        paths.append(rounded_rect(ox + w.x, oy + w.y, w.width, w.height, w.corner_radius))
    return paths
