"""CLI cardcut — python -m cardcut {dieline|template|compose|sheet|fittest|all|check}"""

from __future__ import annotations

import argparse
from pathlib import Path as FsPath

from . import jobs
from .applicator import job_applicator, job_shipunit
from .config import build_pose, load_config
from .instructions import job_instructions
from .selfcheck import check_outputs


def _repo_root() -> FsPath:
    return FsPath(__file__).resolve().parent.parent


def main(argv=None) -> int:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--config", type=FsPath, default=_repo_root() / "presets.toml",
                        help="fichier de presets TOML (défaut: presets.toml du projet)")
    common.add_argument("--card", default="id1", help="preset carte: id1 | id1_inset (défaut: id1)")
    common.add_argument("--window", default="nominal",
                        help="preset fenêtre: nominal | compact | none (défaut: nominal)")
    common.add_argument("--bleed", type=float, default=None, help="fond perdu en mm (défaut: TOML)")
    common.add_argument("--out", type=FsPath, default=_repo_root() / "out", help="dossier de sortie")
    common.add_argument("--no-guides", action="store_true",
                        help="omettre le calque guides des SVG (le témoin d'échelle reste toujours présent)")

    ap = argparse.ArgumentParser(
        prog="cardcut",
        description="Générateur de die-lines pour stickers format carte bancaire "
                    "(ISO ID-1) avec fenêtre puce EMV.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("dieline", parents=[common],
                   help="PDF 1 pose, coupe en ton direct CutContour (voie imprimeur)")
    sub.add_parser("template", parents=[common],
                   help="SVG gabarit avec calques artwork/guides/cut")
    p = sub.add_parser("compose", parents=[common],
                       help="PDF final: artwork PNG + coupe CutContour au-dessus")
    p.add_argument("--artwork", type=FsPath, required=True, help="PNG 300–600 dpi, plein fond perdu")
    p = sub.add_parser("sheet", parents=[common], help="planche multi-poses")
    p.add_argument("--sheet", default="a4_silhouette", help="a4_silhouette | sra3")
    sub.add_parser("fittest", parents=[common],
                   help="PDF A4 papier: 6 variantes de fenêtre à tester sur vraies cartes")
    sub.add_parser("applicator", parents=[common],
                   help="SVG A4 du berceau de pose (carton) : semelle + plaque évidée + raclette")
    sub.add_parser("shipunit", parents=[common],
                   help="SVG unité d'expédition : liner à languettes + kiss-cut + fente dos")
    sub.add_parser("instructions", parents=[common],
                   help="PDF A6 recto-verso : notice de pose + QR vers la page /pose")
    p = sub.add_parser("all", parents=[common], help="tout générer puis self-check")
    p.add_argument("--sheet", default="a4_silhouette")
    p.add_argument("--artwork", type=FsPath, default=None)
    sub.add_parser("check", parents=[common],
                   help="self-check des fichiers de out/ (repasser les MÊMES options "
                        "--card/--window/--bleed que la génération, sinon fausses erreurs)")

    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    pose = build_pose(cfg, args.card, args.window, args.bleed)
    outdir = args.out
    outdir.mkdir(parents=True, exist_ok=True)
    guides = not args.no_guides

    def get_sheet(name: str):
        if name not in cfg.sheets:
            raise SystemExit(f"planche inconnue: {name!r} (disponibles: {sorted(cfg.sheets)})")
        return cfg.sheets[name]

    made: list[FsPath] = []
    if args.cmd in ("dieline", "all"):
        made.append(jobs.job_dieline(pose, cfg, outdir))
    if args.cmd in ("template", "all"):
        made.append(jobs.job_template(pose, cfg, outdir, guides=guides))
    if args.cmd == "compose" or (args.cmd == "all" and args.artwork):
        made.append(jobs.job_compose(pose, cfg, outdir, args.artwork))
    if args.cmd in ("sheet", "all"):
        made.append(jobs.job_sheet(pose, get_sheet(args.sheet), cfg, outdir, guides=guides))
    if args.cmd in ("fittest", "all"):
        made.append(jobs.job_fittest(pose, cfg, outdir))
    if args.cmd in ("applicator", "all"):
        made.append(job_applicator(pose, cfg, outdir))
    if args.cmd in ("shipunit", "all"):
        made.append(job_shipunit(pose, cfg, outdir))
    if args.cmd in ("instructions", "all"):
        made.append(job_instructions(cfg, outdir))

    for f in made:
        print(f"  écrit  {f}")

    if args.cmd in ("all", "check"):
        problems = check_outputs(outdir, cfg, pose)
        if problems:
            print("\nSELF-CHECK : ÉCHEC")
            for pr in problems:
                print(f"  ✗ {pr}")
            return 1
        print("\nSELF-CHECK : OK (cotes, témoin, ton direct, surimpression)")
    return 0
