"""Carte d'instructions A6 recto-verso — prête à imprimer, à glisser dans
chaque commande. Texte validé par le benchmark (2026-08), ton de la marque.

Le QR (segno) est dessiné module par module en rectangles reportlab :
aucune dépendance image (pas de PIL).
"""

from __future__ import annotations

from pathlib import Path as FsPath

import segno
from reportlab.lib.colors import Color, black, white
from reportlab.pdfgen.canvas import Canvas

from . import MM_TO_PT
from .config import Config

PAGE_W, PAGE_H = 105.0, 148.0  # A6 portrait, mm

INK = black
GREY = Color(0.42, 0.42, 0.45)
ACCENT = Color(0.79, 0.32, 0.10)  # flamme, cohérent avec le site

STEPS = [
    ("1", "PRÉPARE",
     ["Nettoie la face de ta carte avec la lingette fournie",
      "(un seul sens, pas de cercles). Attends 10 secondes.",
      "Pose la carte dans le berceau : bien calée au fond."]),
    ("2", "ALIGNE — sans coller",
     ["Sticker encore sur son papier : glisse les deux",
      "languettes dans les fentes du berceau. Vérifie que",
      "la fenêtre tombe sur la puce. Rien ne colle encore :",
      "prends ton temps."]),
    ("3", "COLLE",
     ["Rabats le sticker, décolle la moitié basse du papier,",
      "presse au pouce du centre vers les bords. Détache",
      "les languettes, tire le reste du papier en pressant."]),
]

PANIC = [
    ("Petites bulles ?",
     "Normales : elles partent seules en 24-48 h. Une grosse ? Pousse-la vers le bord le plus proche avec l'ongle."),
    ("Mal parti ?",
     "Tu as ~60 secondes pour décoller doucement et recommencer — et il y a un deuxième sticker dans le colis. Respire."),
    ("Ne touche jamais la face collante",
     "Tiens toujours le sticker par ses languettes : c'est la cause n°1 des coins qui se décollent."),
    ("Nom en relief sur la carte ?",
     "Presse plus longuement autour des lettres ; de légères bulles peuvent y rester, c'est normal."),
]


def _mm(v: float) -> float:
    return v * MM_TO_PT


def _text(c: Canvas, x_mm: float, y_mm: float, size: float, s: str,
          bold: bool = False, color=INK) -> None:
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(_mm(x_mm), _mm(PAGE_H - y_mm), s)


def _qr(c: Canvas, url: str, x_mm: float, y_mm: float, size_mm: float) -> None:
    """Dessine le QR module par module (segno.matrix), quiet zone comprise."""
    qr = segno.make(url, error="m")
    matrix = [list(row) for row in qr.matrix]
    n = len(matrix)
    quiet = 4
    module = size_mm / (n + 2 * quiet)
    c.setFillColor(white)
    c.rect(_mm(x_mm), _mm(PAGE_H - y_mm - size_mm), _mm(size_mm), _mm(size_mm), stroke=0, fill=1)
    c.setFillColor(INK)
    for ry, row in enumerate(matrix):
        for rx, v in enumerate(row):
            if v:
                px = x_mm + (quiet + rx) * module
                py = y_mm + (quiet + ry) * module
                c.rect(_mm(px), _mm(PAGE_H - py - module), _mm(module), _mm(module), stroke=0, fill=1)


def job_instructions(cfg: Config, outdir: FsPath) -> FsPath:
    pose_url = str(cfg.defaults.get("pose_url", "https://monkeysticker.fr/pose"))
    out = outdir / "instructions_a6.pdf"
    c = Canvas(str(out), pagesize=(_mm(PAGE_W), _mm(PAGE_H)), pageCompression=0)
    c.setTitle("Monkey Sticker - Pose parfaite en 60 secondes")

    # ---------------- RECTO : les 3 gestes ----------------
    _text(c, 10, 16, 16, "POSE PARFAITE", bold=True)
    _text(c, 10, 23, 16, "EN 60 SECONDES", bold=True)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(_mm(10), _mm(PAGE_H - 27), _mm(52), _mm(PAGE_H - 27))

    y = 40.0
    for num, title, lines in STEPS:
        # pastille numérotée
        c.setFillColor(ACCENT)
        c.circle(_mm(14), _mm(PAGE_H - y), _mm(4), stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(_mm(14), _mm(PAGE_H - y - 1.4), num)
        _text(c, 22, y + 1.2, 11, title, bold=True)
        yy = y + 7.5
        for line in lines:
            _text(c, 22, yy, 7.5, line, color=GREY)
            yy += 4.2
        y = yy + 6.0

    _text(c, 10, PAGE_H - 8, 6.5,
          "Le berceau carton fourni fait l'alignement pour toi. Retourne la carte →", color=GREY)
    c.showPage()

    # ---------------- VERSO : pas de panique + QR ----------------
    _text(c, 10, 16, 16, "PAS DE PANIQUE", bold=True)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(_mm(10), _mm(PAGE_H - 20), _mm(52), _mm(PAGE_H - 20))

    y = 31.0
    for title, body in PANIC:
        _text(c, 10, y, 9, title, bold=True)
        # découpe naïve du corps en lignes ~52 caractères
        words = body.split()
        line = ""
        yy = y + 5.0
        for w in words:
            if len(line) + len(w) + 1 > 54:
                _text(c, 10, yy, 7.2, line, color=GREY)
                yy += 4.0
                line = w
            else:
                line = f"{line} {w}".strip()
        if line:
            _text(c, 10, yy, 7.2, line, color=GREY)
            yy += 4.0
        y = yy + 4.5

    # QR + lien en toutes lettres
    _qr(c, pose_url, 66, 100, 29)
    _text(c, 10, 108, 9, "La pose en vidéo (30 s)", bold=True)
    _text(c, 10, 114, 7.2, pose_url.replace("https://", ""), color=GREY)
    _text(c, 10, PAGE_H - 8, 6.5,
          "Un souci ? On te renvoie un sticker, sans discuter.", color=GREY)

    c.showPage()
    c.save()
    return out
