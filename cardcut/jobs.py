"""Les cinq livrables : dieline, template, compose, sheet, fittest."""

from __future__ import annotations

import dataclasses
from pathlib import Path as FsPath

from .config import Config
from .geometry import Path, MoveTo, LineTo, pose_paths, rect_path, rounded_rect
from .layouts import impose, keepout_rects, validate
from .models import PoseSpec, SheetSpec
from .pdf_writer import write_pdf
from .svg_writer import path_el, rect_el, text_el, write_svg

CUT_RED = "#FF0000"


def _cut_stroke(cfg: Config) -> float:
    return float(cfg.defaults.get("cut_stroke_pt", 0.5))


def job_dieline(pose: PoseSpec, cfg: Config, outdir: FsPath) -> FsPath:
    """PDF 1 pose (page = boîte de fond perdu), coupe en ton direct CutContour seule."""
    fw, fh = pose.footprint
    out = outdir / "dieline_stickerapp.pdf"
    write_pdf(out, fw, fh,
              cut_paths=pose_paths(pose, pose.bleed, pose.bleed),
              stroke_pt=_cut_stroke(cfg),
              title="Die-line sticker carte ID-1 + fenetre puce (CutContour)")
    return out


def job_template(pose: PoseSpec, cfg: Config, outdir: FsPath, guides: bool = True) -> FsPath:
    """SVG gabarit : calques artwork (vide), guides (fond perdu / zone tranquille), cut."""
    fw, fh = pose.footprint
    card = pose.card
    inset = 2.0  # zone tranquille : éléments importants à ≥ 2 mm du trait de coupe
    safe = rounded_rect(pose.bleed + inset, pose.bleed + inset,
                        card.width - 2 * inset, card.height - 2 * inset,
                        max(card.corner_radius - inset, 0.5))
    guide_els = [
        rect_el(0, 0, fw, fh, stroke="#0088FF", width_pt=0.4, dash="4 2", id_="bleed-box"),
        path_el(safe, stroke="#00AA00", width_pt=0.4, dash="2 2", id_="safe-zone"),
    ]
    if pose.window is not None:
        w = pose.window
        # zone tranquille autour de la fenêtre : rien d'important à moins de 2 mm
        guide_els.append(rect_el(pose.bleed + w.x - inset, pose.bleed + w.y - inset,
                                 w.width + 2 * inset, w.height + 2 * inset,
                                 stroke="#00AA00", width_pt=0.4, dash="2 2"))
    out = outdir / "template_artwork.svg"
    layers: list[tuple[str, list[str]]] = [("artwork", [])]  # placer le visuel ici
    if guides:
        layers.append(("guides", guide_els))
    layers.append(("cut", [path_el(p, stroke=CUT_RED) for p in pose_paths(pose, pose.bleed, pose.bleed)]))
    write_svg(out, fw, fh, layers)
    return out


def job_compose(pose: PoseSpec, cfg: Config, outdir: FsPath, artwork_png: FsPath) -> FsPath:
    """PDF final voie sous-traitance : artwork PNG plein fond perdu + coupe spot au-dessus."""
    artwork_png = FsPath(artwork_png)
    if not artwork_png.exists():
        raise FileNotFoundError(f"artwork introuvable: {artwork_png}")
    fw, fh = pose.footprint
    out = outdir / "final_stickerapp.pdf"
    try:
        write_pdf(out, fw, fh,
                  cut_paths=pose_paths(pose, pose.bleed, pose.bleed),
                  stroke_pt=_cut_stroke(cfg),
                  artwork_png=artwork_png,
                  title="Sticker carte ID-1 - artwork + CutContour")
    except ImportError as e:
        raise SystemExit(
            f"compose: reportlab a besoin de Pillow pour lire un PNG ({e}).\n"
            f"  -> .venv/bin/pip install pillow"
        ) from e
    return out


def job_sheet(pose: PoseSpec, sheet: SheetSpec, cfg: Config, outdir: FsPath,
              guides: bool = True) -> FsPath:
    """Planche multi-poses. kind='silhouette' -> SVG (Studio ajoute SES repères) ;
    kind='printer' -> PDF spot CutContour."""
    positions = impose(sheet, pose)
    validate(sheet, pose, positions)
    fw, fh = pose.footprint

    if sheet.kind == "silhouette":
        witness_mm = float(cfg.defaults.get("witness_mm", 50.0))
        cut_els = []
        guide_els = []
        for (dx, dy) in positions:
            for p in pose_paths(pose, dx + pose.bleed, dy + pose.bleed):
                cut_els.append(path_el(p, stroke=CUT_RED))
            guide_els.append(rect_el(dx, dy, fw, fh, stroke="#BBBBBB", width_pt=0.4, dash="3 2"))
        for (kx, ky, kw, kh) in keepout_rects(sheet):
            guide_els.append(rect_el(kx, ky, kw, kh, stroke="#DD8800", width_pt=0.4, dash="1 2"))
        # Témoin d'échelle sous la grille — TOUJOURS émis (contrôle du piège 96 dpi),
        # dans son propre calque pour survivre à --no-guides
        wm_txt = f"{witness_mm:.2f}".replace(".", ",")
        wx = max(sheet.margin, (sheet.width - witness_mm) / 2)
        wy = max(dy for _, dy in positions) + fh + 10.0
        wh = 8.0
        if (wx + witness_mm > sheet.width - sheet.margin
                or wy + wh > sheet.height - sheet.margin):
            raise ValueError("témoin d'échelle hors page : réduire rows/cols ou agrandir la planche")
        for (kx, ky, kw, kh) in keepout_rects(sheet):
            if wx < kx + kw and wx + witness_mm > kx and wy - 3.0 < ky + kh and wy + wh > ky:
                raise ValueError("témoin d'échelle dans une zone réservée aux repères : ajuster la planche")
        witness_els = [
            text_el(wx, wy - 1.5, 6.0,
                    f"Temoin : ce rectangle doit mesurer {wm_txt} mm de large"),
            rect_el(wx, wy, witness_mm, wh, stroke="#555555", width_pt=0.7, id_="witness"),
        ]
        layers = []
        if guides:
            layers.append(("guides", guide_els))
        layers.append(("scale-check", witness_els))
        layers.append(("cut", cut_els))
        out = outdir / f"sheet_{sheet.name}.svg"
        write_svg(out, sheet.width, sheet.height, layers)
        return out

    # kind == "printer" : PDF spot uniquement, l'imprimeur gère ses propres repères
    cut = []
    for (dx, dy) in positions:
        cut.extend(pose_paths(pose, dx + pose.bleed, dy + pose.bleed))
    out = outdir / f"sheet_{sheet.name}.pdf"
    write_pdf(out, sheet.width, sheet.height, cut_paths=cut, stroke_pt=_cut_stroke(cfg),
              title=f"Planche {sheet.name} - {len(positions)} poses (CutContour)")
    return out


def _crosshair(x: float, y: float, arm: float = 1.5) -> Path:
    """Croix de repérage (centre théorique des contacts ISO)."""
    return Path((
        MoveTo(x - arm, y), LineTo(x + arm, y),
        MoveTo(x, y - arm), LineTo(x, y + arm),
    ))


def job_fittest(pose: PoseSpec, cfg: Config, outdir: FsPath) -> FsPath:
    """PDF A4 encre noire seule : 6 variantes de fenêtre étiquetées, à imprimer
    à 100 % et poser sur de vraies cartes pour élire la variante."""
    card = pose.card
    nominal = cfg.windows.get("nominal", pose.window)
    compact = cfg.windows.get("compact", nominal)
    if nominal is None:
        raise ValueError("fittest: aucune fenêtre 'nominal' dans les presets")

    def shift(w, dx, dy):
        return dataclasses.replace(w, x=w.x + dx, y=w.y + dy)

    variants = [
        ("A", nominal, "nominal"),
        ("B", compact, "compact"),
        ("C", shift(nominal, -0.5, 0), "nominal x-0,5"),
        ("D", shift(nominal, +0.5, 0), "nominal x+0,5"),
        ("E", shift(nominal, 0, -0.5), "nominal y-0,5"),
        ("F", shift(nominal, 0, +0.5), "nominal y+0,5"),
    ]

    page_w, page_h = 210.0, 297.0
    cols, col_gap, row_gap = 2, 10.0, 9.0
    rows = (len(variants) + cols - 1) // cols
    grid_w = cols * card.width + (cols - 1) * col_gap
    x0 = (page_w - grid_w) / 2
    y0 = 34.0

    witness_mm = float(cfg.defaults.get("witness_mm", 50.0))
    wm_txt = f"{witness_mm:.2f}".replace(".", ",")

    black: list[tuple] = [
        ("text", 14.0, 12.0, 10.0, "FIT-TEST fenetre puce - imprimer a 100 % (taille reelle),"),
        ("text", 14.0, 17.0, 10.0, "jamais « ajuster a la page »."),
        ("text", 14.0, 24.0, 8.0, "Poser chaque decoupe sur une vraie carte (puce a gauche) et choisir la variante."),
        ("text", 14.0, 29.0, 8.0, f"Temoin en bas de page = {wm_txt} mm exactement (verifier au pied a coulisse)."),
    ]
    stroke = 0.57  # ~0,2 mm

    for i, (label, win, desc) in enumerate(variants):
        col, row = i % cols, i // cols
        cx = x0 + col * (card.width + col_gap)
        cy = y0 + row * (card.height + row_gap)
        black.append(("path", rounded_rect(cx, cy, card.width, card.height, card.corner_radius), stroke))
        black.append(("path", rounded_rect(cx + win.x, cy + win.y, win.width, win.height,
                                           win.corner_radius), stroke))
        # centre théorique des contacts ISO 7816-2 : (15,06 ; 23,89)
        black.append(("path", _crosshair(cx + 15.06, cy + 23.89), 0.3))
        black.append(("text", cx + 34.0, cy + 12.0, 9.0, label))
        black.append(("text", cx + 34.0, cy + 18.0, 6.5,
                      f"{win.width:g} x {win.height:g} @ ({win.x:g} ; {win.y:g}) - {desc}"))

    wy = y0 + rows * card.height + (rows - 1) * row_gap + 12.0
    black.append(("text", 80.0, wy - 2.0, 8.0, f"Temoin : {wm_txt} mm"))
    black.append(("path", rect_path(80.0, wy, witness_mm, 8.0), 0.85))

    out = outdir / "fittest_a4.pdf"
    write_pdf(out, page_w, page_h, black_elements=black,
              title="Fit-test fenetre puce - encre noire, sans coupe")
    return out
