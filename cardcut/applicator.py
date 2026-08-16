"""Berceau applicateur et unité d'expédition — le système de pose.

Design validé par benchmark (2026-08) : berceau à cavité (type Spigen EZ Fit)
+ verrouillage par languettes-fentes (adaptation carton du système à pions
ZAGG EZ Apply) :

- BERCEAU (à découper dans du carton/chipboard 0,4-0,8 mm, 2 exemplaires de
  chaque pièce si carton fin, à contrecoller) :
  * semelle pleine 130 × 85 mm ;
  * plaque évidée : fenêtre carte 86,1 × 54,5 mm (ISO + 0,25 mm de jeu/côté),
    encoche d'extraction demi-lune, 2 fentes de verrouillage au-dessus.
- UNITÉ D'EXPÉDITION (le sticker tel qu'il part dans l'enveloppe) :
  * rectangle de liner 92 × 60 mm avec 2 languettes en haut (full cut) ;
  * sticker kiss-cut centré (contour carte + fenêtre puce) ;
  * ligne de fente du liner (à couper AU DOS, trait discontinu indicatif).

Gestuelle : carte dans la cavité → languettes dans les fentes (rien ne colle
encore) → rabattre, décoller la moitié basse du liner, presser du centre vers
les bords → détacher les languettes, tirer le reste du liner.
"""

from __future__ import annotations

from pathlib import Path as FsPath

from .config import Config
from .geometry import Close, LineTo, MoveTo, Path, rect_path, rounded_rect
from .models import PoseSpec
from .svg_writer import path_el, text_el, write_svg

CUT_RED = "#FF0000"
BACK_BLUE = "#0088FF"  # coupes à faire AU DOS (liner) — trait discontinu

# --- Cotes du système (mm) — validées par le benchmark -------------------

CRADLE_W, CRADLE_H, CRADLE_R = 130.0, 85.0, 6.0
WINDOW_W, WINDOW_H, WINDOW_R = 86.1, 54.5, 3.2   # carte ISO + jeu 0,25/côté
NOTCH_D = 16.0                                    # encoche d'extraction
SLOT_W, SLOT_H = 13.4, 1.6                        # fentes de verrouillage
SLOT_SPACING = 44.0                               # entraxe des fentes/languettes
SLOT_Y = 11.0                                     # depuis le haut de la plaque
WINDOW_Y = 22.0                                   # fenêtre sous les fentes

LINER_W, LINER_H = 92.0, 60.0                     # corps du liner d'expédition
TAB_W_BASE, TAB_W_TIP, TAB_H = 14.0, 12.8, 10.0   # languettes trapézoïdales
# Fente du liner SOUS la fenêtre puce (qui s'étend de 29,6 % à 59,3 % de la
# hauteur carte) : à 65 %, on décolle d'abord le tiers bas, puis le reste
# se tire par les languettes — sans que le bord de fente ne croise la fenêtre.
SPLIT_FRACTION = 0.65

SQUEEGEE_W, SQUEEGEE_H, SQUEEGEE_R = 60.0, 40.0, 4.0  # mini-raclette bonus


def _circle(cx: float, cy: float, r: float) -> Path:
    """Cercle approché par 4 arcs de coin (rounded_rect dégénéré)."""
    return rounded_rect(cx - r, cy - r, 2 * r, 2 * r, r)


def _tabbed_liner(x: float, y: float) -> Path:
    """Contour full-cut du liner : rectangle + 2 languettes trapézoïdales en haut.
    (x, y) = coin haut-gauche de la zone TOTALE (languettes comprises)."""
    body_top = y + TAB_H
    cx = x + LINER_W / 2
    tabs = [cx - SLOT_SPACING / 2, cx + SLOT_SPACING / 2]  # centres des languettes

    ops: list = [MoveTo(x, body_top)]
    # bord supérieur du corps, interrompu par les 2 languettes
    for tcx in tabs:
        base_l = tcx - TAB_W_BASE / 2
        base_r = tcx + TAB_W_BASE / 2
        tip_l = tcx - TAB_W_TIP / 2
        tip_r = tcx + TAB_W_TIP / 2
        ops.append(LineTo(base_l, body_top))
        ops.append(LineTo(tip_l, y))          # flanc gauche (léger biseau)
        ops.append(LineTo(tip_r, y))          # sommet
        ops.append(LineTo(base_r, body_top))  # flanc droit
    # fin du bord supérieur puis tour du corps (coins vifs, r léger via segments)
    ops.append(LineTo(x + LINER_W, body_top))
    ops.append(LineTo(x + LINER_W, body_top + LINER_H))
    ops.append(LineTo(x, body_top + LINER_H))
    ops.append(Close())
    return Path(tuple(ops))


def job_applicator(pose: PoseSpec, cfg: Config, outdir: FsPath) -> FsPath:
    """Planche A4 du berceau : semelle + plaque évidée + mini-raclette.
    À découper dans du carton rigide ; contrecoller plaque sur semelle."""
    page_w, page_h = 210.0, 297.0
    x0 = (page_w - CRADLE_W) / 2
    cut: list[str] = []
    guides: list[str] = []

    # — Pièce 1 : semelle pleine —
    y_base = 18.0
    cut.append(path_el(rounded_rect(x0, y_base, CRADLE_W, CRADLE_H, CRADLE_R), stroke=CUT_RED))
    guides.append(text_el(x0, y_base - 3.0, 7.0, "PIECE 1 - semelle pleine (dessous)"))

    # — Pièce 2 : plaque évidée —
    y_plate = y_base + CRADLE_H + 14.0
    cut.append(path_el(rounded_rect(x0, y_plate, CRADLE_W, CRADLE_H, CRADLE_R), stroke=CUT_RED))
    guides.append(text_el(x0, y_plate - 3.0, 7.0, "PIECE 2 - plaque evidee (dessus, a contrecoller sur la semelle)"))

    # fenêtre carte, centrée horizontalement
    win_x = x0 + (CRADLE_W - WINDOW_W) / 2
    win_y = y_plate + WINDOW_Y
    cut.append(path_el(rounded_rect(win_x, win_y, WINDOW_W, WINDOW_H, WINDOW_R), stroke=CUT_RED, id_="window"))
    # encoche d'extraction demi-lune sur le bord bas de la fenêtre
    cut.append(path_el(_circle(x0 + CRADLE_W / 2, win_y + WINDOW_H, NOTCH_D / 2), stroke=CUT_RED))
    # 2 fentes de verrouillage au-dessus de la fenêtre
    cx = x0 + CRADLE_W / 2
    for scx in (cx - SLOT_SPACING / 2, cx + SLOT_SPACING / 2):
        cut.append(path_el(
            rounded_rect(scx - SLOT_W / 2, y_plate + SLOT_Y, SLOT_W, SLOT_H, SLOT_H / 2),
            stroke=CUT_RED,
        ))
    guides.append(text_el(win_x, win_y - 2.0, 5.0,
                          "fenetre 86,1 x 54,5 - la carte se cale dedans ; languettes du sticker dans les fentes"))

    # — Pièce 3 : mini-raclette —
    y_sq = y_plate + CRADLE_H + 14.0
    sq_x = (page_w - SQUEEGEE_W) / 2
    cut.append(path_el(rounded_rect(sq_x, y_sq, SQUEEGEE_W, SQUEEGEE_H, SQUEEGEE_R), stroke=CUT_RED))
    guides.append(text_el(sq_x, y_sq - 3.0, 7.0, "PIECE 3 - mini-raclette (marouflage du centre vers les bords)"))

    guides.append(text_el(15.0, page_h - 14.0, 6.0,
                          "Berceau de pose Monkey Sticker - carton 0,4-0,8 mm - si carton fin : decouper 2x pieces 1 et 2 et contrecoller"))

    out = outdir / "applicator_a4.svg"
    write_svg(out, page_w, page_h, [("guides", guides), ("cut", cut)])
    return out


def job_shipunit(pose: PoseSpec, cfg: Config, outdir: FsPath) -> FsPath:
    """Unité d'expédition : liner à languettes (full cut) + sticker kiss-cut
    + ligne de fente du liner (coupe au dos, indicative)."""
    page_w = LINER_W + 16.0
    page_h = TAB_H + LINER_H + 16.0
    x = 8.0
    y = 8.0
    card = pose.card

    fullcut = [path_el(_tabbed_liner(x, y), stroke=CUT_RED, id_="liner")]

    # sticker kiss-cut centré dans le corps du liner
    body_top = y + TAB_H
    sx = x + (LINER_W - card.width) / 2
    sy = body_top + (LINER_H - card.height) / 2
    kiss = [path_el(rounded_rect(sx, sy, card.width, card.height, card.corner_radius),
                    stroke="#FF00FF", id_="kiss-card")]
    if pose.window is not None:
        w = pose.window
        kiss.append(path_el(
            rounded_rect(sx + w.x, sy + w.y, w.width, w.height, w.corner_radius),
            stroke="#FF00FF", id_="kiss-window",
        ))

    # ligne de fente du liner — à couper AU DOS (trait discontinu indicatif)
    split_y = sy + card.height * SPLIT_FRACTION
    back = [path_el(Path((MoveTo(x, split_y), LineTo(x + LINER_W, split_y))),
                    stroke=BACK_BLUE, dash="3 2", id_="liner-split")]

    guides = [
        text_el(x, y - 2.5, 5.0,
                "Unite d'expedition - ROUGE : full cut / MAGENTA : kiss-cut / BLEU : fente du liner (couper AU DOS)"),
        text_el(x, page_h - 3.5, 4.5,
                "Languettes dans les fentes du berceau -> rien ne colle avant validation de l'alignement"),
    ]

    out = outdir / "shipunit.svg"
    write_svg(out, page_w, page_h, [("guides", guides), ("back-cut", back), ("kiss", kiss), ("cut", fullcut)])
    return out
