"""Imposition multi-poses.

PIÈGE DÉSAMORCÉ ICI : le gap s'applique entre BOÎTES DE FOND PERDU, jamais
entre traits de coupe — sinon avec 3 mm de bleed par pose, deux visuels
voisins se chevaucheraient (3+3 = 6 > 5). Distance coupe-à-coupe résultante :
gap + 2 × bleed.
"""

from __future__ import annotations

from .models import PoseSpec, SheetSpec


def impose(sheet: SheetSpec, pose: PoseSpec) -> list[tuple[float, float]]:
    """Positions (dx, dy) du coin haut-gauche de chaque boîte de fond perdu.
    Grille centrée horizontalement, posée sous les réserves de repères."""
    fw, fh = pose.footprint
    grid_w = sheet.cols * fw + (sheet.cols - 1) * sheet.gap
    x0 = (sheet.width - grid_w) / 2
    top_keepout = sheet.keepout_size if ({"TL", "TR"} & set(sheet.keepout_corners)) else 0.0
    y0 = max(sheet.margin, top_keepout)
    return [
        (x0 + col * (fw + sheet.gap), y0 + row * (fh + sheet.gap))
        for row in range(sheet.rows)
        for col in range(sheet.cols)
    ]


def keepout_rects(sheet: SheetSpec) -> list[tuple[float, float, float, float]]:
    """Zones réservées aux repères print & cut (x, y, w, h)."""
    s = sheet.keepout_size
    if s <= 0:
        return []
    corners = {
        "TL": (0.0, 0.0, s, s),
        "TR": (sheet.width - s, 0.0, s, s),
        "BL": (0.0, sheet.height - s, s, s),
        "BR": (sheet.width - s, sheet.height - s, s, s),
    }
    return [corners[c] for c in sheet.keepout_corners]


def validate(sheet: SheetSpec, pose: PoseSpec, positions: list[tuple[float, float]]) -> None:
    """Lève si une pose sort des marges ou chevauche une réserve de repères."""
    fw, fh = pose.footprint
    eps = 1e-6
    for i, (dx, dy) in enumerate(positions):
        if (dx < sheet.margin - eps or dy < sheet.margin - eps
                or dx + fw > sheet.width - sheet.margin + eps
                or dy + fh > sheet.height - sheet.margin + eps):
            raise ValueError(
                f"pose {i + 1} hors marges: ({dx:.2f} ; {dy:.2f}) + {fw:.2f}×{fh:.2f} "
                f"sur planche {sheet.width}×{sheet.height}, marge {sheet.margin}"
            )
        for (kx, ky, kw, kh) in keepout_rects(sheet):
            if dx < kx + kw - eps and dx + fw > kx + eps and dy < ky + kh - eps and dy + fh > ky + eps:
                raise ValueError(
                    f"pose {i + 1} chevauche une zone réservée aux repères "
                    f"({kx:.0f} ; {ky:.0f} ; {kw:.0f}×{kh:.0f}) — réduire rows/cols ou le bleed"
                )
    # Défense en profondeur : aucune paire de poses ne doit se chevaucher
    # (tient le contrat du docstring même si gap/bleed arrivent par un autre chemin)
    for i in range(len(positions)):
        ax, ay = positions[i]
        for j in range(i + 1, len(positions)):
            bx, by = positions[j]
            if ax < bx + fw - eps and ax + fw > bx + eps and ay < by + fh - eps and ay + fh > by + eps:
                raise ValueError(f"poses {i + 1} et {j + 1} se chevauchent — gap/bleed incohérents")
