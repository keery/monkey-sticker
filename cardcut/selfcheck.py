"""Relecture des fichiers générés dans out/ — vérifie cotes, témoin, ton direct.

Les PDF sont écrits sans compression (pageCompression=0), donc vérifiables par
simple lecture d'octets, sans parseur PDF.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path as FsPath

from . import MM_TO_PT
from .config import Config
from .layouts import impose
from .models import PoseSpec

SVG_NS = "{http://www.w3.org/2000/svg}"
TOL_PT = 0.02  # ~7 µm


def check_outputs(outdir: FsPath, cfg: Config, pose: PoseSpec) -> list[str]:
    problems: list[str] = []
    fw, fh = pose.footprint
    witness = float(cfg.defaults.get("witness_mm", 50.0))
    seen = 0

    f = outdir / "dieline_stickerapp.pdf"
    if f.exists():
        seen += 1
        problems += _check_pdf(f, fw, fh, expect_spot=True)
    f = outdir / "final_stickerapp.pdf"
    if f.exists():
        seen += 1
        problems += _check_pdf(f, fw, fh, expect_spot=True)
    f = outdir / "fittest_a4.pdf"
    if f.exists():
        seen += 1
        problems += _check_pdf(f, 210.0, 297.0, expect_spot=False)
    f = outdir / "template_artwork.svg"
    if f.exists():
        seen += 1
        problems += _check_svg(f, fw, fh, pose, witness_mm=None, n_poses=1)
    for name, sheet in cfg.sheets.items():
        f = outdir / f"sheet_{name}.svg"
        if f.exists():
            seen += 1
            problems += _check_svg(f, sheet.width, sheet.height, pose, witness_mm=witness,
                                   n_poses=len(impose(sheet, pose)))
        f = outdir / f"sheet_{name}.pdf"
        if f.exists():
            seen += 1
            problems += _check_pdf(f, sheet.width, sheet.height, expect_spot=True)

    if seen == 0:
        problems.append(f"aucun fichier généré trouvé dans {outdir}")
    return problems


# --- SVG ---------------------------------------------------------------

def _check_svg(f: FsPath, page_w_mm: float, page_h_mm: float, pose: PoseSpec,
               witness_mm: float | None, n_poses: int) -> list[str]:
    p: list[str] = []
    try:
        root = ET.parse(f).getroot()
    except ET.ParseError as e:
        return [f"{f.name}: SVG invalide ({e})"]

    # Page : width/height en mm cohérents avec le viewBox en pt
    for attr, expect in (("width", page_w_mm), ("height", page_h_mm)):
        val = root.get(attr, "")
        if not val.endswith("mm"):
            p.append(f"{f.name}: attribut {attr} sans unité mm: {val!r}")
        elif abs(float(val[:-2]) - expect) > 0.01:
            p.append(f"{f.name}: {attr}={val} attendu {expect:.2f}mm")
    vb = (root.get("viewBox") or "").split()
    if len(vb) != 4:
        p.append(f"{f.name}: viewBox absent ou invalide")
    else:
        for i, expect in ((2, page_w_mm), (3, page_h_mm)):
            if abs(float(vb[i]) - expect * MM_TO_PT) > TOL_PT:
                p.append(f"{f.name}: viewBox[{i}]={vb[i]} attendu {expect * MM_TO_PT:.4f}")

    # Calque cut : comptage EXACT des tracés (n_poses × [carte + fenêtre éventuelle])
    # puis, pose par pose, cotes de la carte ET de la fenêtre + son décalage relatif.
    cut = None
    for g in root.iter(f"{SVG_NS}g"):
        if g.get("id") == "cut":
            cut = g
            break
    if cut is None:
        p.append(f"{f.name}: calque 'cut' introuvable")
    else:
        paths = cut.findall(f"{SVG_NS}path")
        per_pose = 2 if pose.window is not None else 1
        expected = n_poses * per_pose
        if len(paths) != expected:
            p.append(f"{f.name}: {len(paths)} tracés cut, attendu {expected} "
                     f"({n_poses} pose(s) × {per_pose})")
        else:
            try:
                for i in range(n_poses):
                    cb = _d_bbox(paths[i * per_pose].get("d", ""))
                    for got, expect_mm, lbl in ((cb[2] - cb[0], pose.card.width, "largeur"),
                                                (cb[3] - cb[1], pose.card.height, "hauteur")):
                        if abs(got - expect_mm * MM_TO_PT) > TOL_PT:
                            p.append(f"{f.name}: pose {i + 1}, {lbl} carte "
                                     f"{got / MM_TO_PT:.3f} mm attendu {expect_mm:.2f} mm")
                    if pose.window is not None:
                        w = pose.window
                        wb = _d_bbox(paths[i * per_pose + 1].get("d", ""))
                        for got, expect_mm, lbl in ((wb[2] - wb[0], w.width, "largeur fenêtre"),
                                                    (wb[3] - wb[1], w.height, "hauteur fenêtre"),
                                                    (wb[0] - cb[0], w.x, "décalage x fenêtre"),
                                                    (wb[1] - cb[1], w.y, "décalage y fenêtre")):
                            if abs(got - expect_mm * MM_TO_PT) > TOL_PT:
                                p.append(f"{f.name}: pose {i + 1}, {lbl} "
                                         f"{got / MM_TO_PT:.3f} mm attendu {expect_mm:.2f} mm")
            except Exception as e:  # noqa: BLE001 — un échec de parse est un finding
                p.append(f"{f.name}: échec du parse des tracés cut ({e})")

    # Témoin d'échelle : présence, largeur exacte, et contenu dans la page
    if witness_mm is not None:
        w_rect = None
        for r in root.iter(f"{SVG_NS}rect"):
            if r.get("id") == "witness":
                w_rect = r
                break
        if w_rect is None:
            p.append(f"{f.name}: rectangle témoin absent")
        else:
            wx, wy = float(w_rect.get("x")), float(w_rect.get("y"))
            ww, wh = float(w_rect.get("width")), float(w_rect.get("height"))
            if abs(ww - witness_mm * MM_TO_PT) > TOL_PT:
                p.append(f"{f.name}: témoin {ww / MM_TO_PT:.3f} mm attendu {witness_mm:.2f} mm")
            if len(vb) == 4 and (wx < -TOL_PT or wy < -TOL_PT
                                 or wx + ww > float(vb[2]) + TOL_PT
                                 or wy + wh > float(vb[3]) + TOL_PT):
                p.append(f"{f.name}: témoin hors page")
    return p


def _d_bbox(d: str) -> tuple[float, float, float, float]:
    """Bbox à partir des points d'arrivée M/L/A. Pour nos rectangles arrondis
    (extrêmes atteints aux extrémités d'arcs), c'est le bbox exact."""
    toks = d.replace(",", " ").split()
    xs, ys = [], []
    i = 0
    while i < len(toks):
        t = toks[i]
        if t in ("M", "L"):
            xs.append(float(toks[i + 1]))
            ys.append(float(toks[i + 2]))
            i += 3
        elif t == "A":
            xs.append(float(toks[i + 6]))
            ys.append(float(toks[i + 7]))
            i += 8
        elif t == "Z":
            i += 1
        else:
            raise ValueError(f"commande SVG inattendue: {t!r}")
    return (min(xs), min(ys), max(xs), max(ys))


# --- PDF ---------------------------------------------------------------

def _check_pdf(f: FsPath, page_w_mm: float, page_h_mm: float, expect_spot: bool) -> list[str]:
    p: list[str] = []
    data = f.read_bytes()

    m = re.search(rb"/MediaBox\s*\[\s*([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s+([\d\.\-]+)\s*\]", data)
    if not m:
        p.append(f"{f.name}: MediaBox introuvable")
    else:
        got_w, got_h = float(m.group(3)), float(m.group(4))
        if abs(got_w - page_w_mm * MM_TO_PT) > 0.05 or abs(got_h - page_h_mm * MM_TO_PT) > 0.05:
            p.append(f"{f.name}: page {got_w / MM_TO_PT:.2f}×{got_h / MM_TO_PT:.2f} mm "
                     f"attendu {page_w_mm:.2f}×{page_h_mm:.2f} mm")

    if expect_spot:
        if b"/Separation" not in data:
            p.append(f"{f.name}: pas de colorspace /Separation (ton direct absent)")
        if b"/CutContour" not in data:
            p.append(f"{f.name}: ton direct 'CutContour' absent (nom exact requis, sensible à la casse)")
        if b"/OP true" not in data:
            p.append(f"{f.name}: surimpression du contour absente (/OP true)")
    else:
        if b"CutContour" in data:
            p.append(f"{f.name}: ton direct CutContour présent alors que ce fichier doit être encre noire seule")
    return p
