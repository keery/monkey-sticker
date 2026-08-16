"""Chargement de presets.toml + validations métier."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from pathlib import Path as FsPath

from .models import CardSpec, PoseSpec, SheetSpec, WindowSpec


@dataclass(frozen=True)
class Config:
    cards: dict
    windows: dict
    sheets: dict
    defaults: dict


def load_config(path: FsPath) -> Config:
    data = tomllib.loads(FsPath(path).read_text(encoding="utf-8"))
    cards = {k: CardSpec(**v) for k, v in data.get("card", {}).items()}
    windows = {k: WindowSpec(**v) for k, v in data.get("window", {}).items()}
    sheets = {}
    for k, v in data.get("sheet", {}).items():
        v = dict(v)
        v["keepout_corners"] = tuple(v.get("keepout_corners", ()))
        sheet = SheetSpec(name=k, **v)
        _validate_sheet(sheet)
        sheets[k] = sheet
    return Config(cards=cards, windows=windows, sheets=sheets, defaults=data.get("defaults", {}))


def _validate_sheet(s: SheetSpec) -> None:
    if s.kind not in ("silhouette", "printer"):
        raise ValueError(f"planche {s.name}: kind {s.kind!r} inconnu (silhouette | printer)")
    if s.width <= 0 or s.height <= 0:
        raise ValueError(f"planche {s.name}: dimensions invalides {s.width}×{s.height}")
    if s.cols < 1 or s.rows < 1:
        raise ValueError(f"planche {s.name}: rows et cols doivent être >= 1 (reçu {s.rows}×{s.cols})")
    if s.gap < 0:
        raise ValueError(f"planche {s.name}: gap négatif ({s.gap}) — "
                         "les boîtes de fond perdu se chevaucheraient")
    if s.margin < 0:
        raise ValueError(f"planche {s.name}: marge négative ({s.margin})")
    if s.keepout_size < 0:
        raise ValueError(f"planche {s.name}: keepout_size négatif ({s.keepout_size})")
    bad = set(s.keepout_corners) - {"TL", "TR", "BL", "BR"}
    if bad:
        raise ValueError(f"planche {s.name}: coins de réserve inconnus {sorted(bad)} "
                         "(TL | TR | BL | BR)")


def build_pose(cfg: Config, card_key: str, window_key: str, bleed: float | None) -> PoseSpec:
    if card_key not in cfg.cards:
        raise ValueError(f"carte inconnue: {card_key!r} (disponibles: {sorted(cfg.cards)})")
    card = cfg.cards[card_key]

    window = None
    if window_key != "none":
        if window_key not in cfg.windows:
            raise ValueError(f"fenêtre inconnue: {window_key!r} (disponibles: {sorted(cfg.windows)} ou 'none')")
        window = cfg.windows[window_key]

    if bleed is None:
        bleed = float(cfg.defaults.get("bleed", 3.0))

    _validate_pose(card, window, bleed)
    return PoseSpec(card=card, window=window, bleed=bleed)


def _validate_pose(card: CardSpec, window: WindowSpec | None, bleed: float) -> None:
    if bleed < 0:
        raise ValueError(f"fond perdu négatif: {bleed}")
    if card.corner_radius > min(card.width, card.height) / 2:
        raise ValueError("rayon de coin carte > moitié du petit côté")
    if window is None:
        return
    if window.corner_radius > min(window.width, window.height) / 2:
        raise ValueError("rayon de coin fenêtre > moitié du petit côté")
    if window.x < 0 or window.y < 0:
        raise ValueError("fenêtre hors de la carte (x ou y négatif)")
    if window.x + window.width > card.width or window.y + window.height > card.height:
        raise ValueError(
            f"fenêtre hors de la carte: ({window.x}+{window.width} ; {window.y}+{window.height}) "
            f"dépasse ({card.width} ; {card.height})"
        )
    # Largeur de matière restante entre fenêtre et bord de carte (pelage/solidité)
    lands = (window.x, window.y, card.width - window.x - window.width, card.height - window.y - window.height)
    if min(lands) < 2.0:
        raise ValueError(f"moins de 2 mm de matière entre la fenêtre et un bord de carte: {min(lands):.2f} mm")
