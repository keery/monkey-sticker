"""Spécifications gelées — tout en millimètres."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CardSpec:
    """Contour extérieur de la carte (rectangle arrondi)."""

    width: float
    height: float
    corner_radius: float


@dataclass(frozen=True)
class WindowSpec:
    """Fenêtre puce. (x, y) = coin haut-gauche de la fenêtre depuis le coin
    haut-gauche de la carte, carte en paysage, puce à gauche."""

    width: float
    height: float
    x: float
    y: float
    corner_radius: float


@dataclass(frozen=True)
class PoseSpec:
    """Une pose = carte + fenêtre éventuelle + fond perdu."""

    card: CardSpec
    window: WindowSpec | None
    bleed: float

    @property
    def footprint(self) -> tuple[float, float]:
        """Boîte de fond perdu (carte + bleed de chaque côté)."""
        return (self.card.width + 2 * self.bleed, self.card.height + 2 * self.bleed)


@dataclass(frozen=True)
class SheetSpec:
    """Planche multi-poses. kind = 'silhouette' (SVG, zones repères réservées)
    ou 'printer' (PDF ton direct CutContour)."""

    name: str
    kind: str
    width: float
    height: float
    margin: float
    gap: float
    cols: int
    rows: int
    keepout_size: float
    keepout_corners: tuple[str, ...]
