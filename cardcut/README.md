# Stickers format carte bancaire — `cardcut`

Générateur de fichiers de découpe (die-lines) pour des stickers à coller sur des
cartes bancaires : contour au format exact **ISO ID-1** et **fenêtre découpée à
l'emplacement de la puce EMV** pour ne pas la couvrir.

Deux voies de production supportées :

| Voie | Machine / prestataire | Fichier généré |
|---|---|---|
| **A — Maison (recommandée)** | Silhouette Cameo 5/5α + Designer Edition | `sheet_a4_silhouette.svg` (kiss-cut print & cut) |
| **B — Sous-traitance** | StickerApp (seul imprimeur en ligne vérifié acceptant les fenêtres intérieures) | `dieline_stickerapp.pdf` / `final_stickerapp.pdf` (ton direct `CutContour`) |

## Installation

```bash
python3.13 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Commandes

```bash
.venv/bin/python -m cardcut all            # tout générer dans out/ + self-check
.venv/bin/python -m cardcut fittest        # PDF A4 papier : 6 variantes de fenêtre à tester
.venv/bin/python -m cardcut sheet          # planche A4 SVG pour Silhouette (2×2 poses)
.venv/bin/python -m cardcut sheet --sheet sra3   # planche SRA3 PDF (voie imprimeur, 18 poses)
.venv/bin/python -m cardcut dieline        # PDF 1 pose, coupe CutContour seule
.venv/bin/python -m cardcut template       # SVG gabarit (calques artwork/guides/cut)
.venv/bin/python -m cardcut compose --artwork visuel.png   # PDF final StickerApp (nécessite pillow)
.venv/bin/python -m cardcut check          # re-vérifier out/ (repasser les MÊMES options que la génération)
```

Options communes : `--card id1|id1_inset` · `--window nominal|compact|none` ·
`--bleed MM` · `--out DIR` · `--no-guides` · `--config FICHIER.toml`

## Cotes (validées le 2026-08-06 — ne pas modifier sans re-sourcer)

- **Carte ID-1** : 85,60 × 53,98 mm, rayon de coin 3,18 mm — ISO/IEC 7810:2019 §3.5.
  Variante `id1_inset` (85,30 × 53,68 mm, soit −0,15 mm par côté) : **réduit** le
  risque de débord sur les cartes sous-cote (les cartes réelles vont de 85,37 à
  85,90 mm de large) sans le garantir — la marge restante (~0,035 mm/côté) est
  inférieure aux tolérances de coupe (±0,5 à ±1 mm). Pour un zéro-débord quasi
  certain, ajouter un preset avec retrait ≥ tolérance de coupe + erreur de pose
  (p. ex. 0,5 mm/côté → 84,60 × 52,98 mm).
- **Contacts puce** (ISO/IEC 7816-2:2007, Fig. 2) : boîte englobante x 10,25→19,87 mm,
  y 19,23→28,55 mm, centre à (15,06 ; 23,89) — carte en paysage, puce à gauche,
  origine au coin haut-gauche.
- **Fenêtre par défaut** : 16 × 16 mm à (7,0 ; 16,0), rayon 1,8 mm. La norme ne borne
  pas la taille max des contacts ; les modules dual-interface font ~11,8 × 13,0 mm,
  d'où une fenêtre généreuse (≥ 1,5 mm de garde + tolérance de coupe ±1 mm).
- **Avant toute série : mesurer la puce de 2–3 cartes cibles au pied à coulisse**
  et faire le fit-test ci-dessous.

## Procédure fit-test (à faire en premier)

1. `python -m cardcut fittest` → imprimer `out/fittest_a4.pdf` **à 100 % (taille
   réelle), jamais « ajuster à la page »**.
2. Vérifier le témoin en bas de page : **50,00 mm** au pied à coulisse (±0,2 mm).
   S'il fait ~37,5 mm, l'impression a été mise à l'échelle 75 % (piège 72/96 dpi).
3. Découper grossièrement les 6 cartes (A–F), les poser sur de vraies cartes
   bancaires (banques différentes) : la fenêtre doit dégager la plaque métallique
   partout. La croix fine marque le centre théorique des contacts ISO.
4. Reporter la variante gagnante : `--window compact`, ou éditer `presets.toml`.

## Voie A — Silhouette Cameo (kiss-cut à la maison)

1. `python -m cardcut sheet` → `out/sheet_a4_silhouette.svg`.
2. Importer le SVG dans **Silhouette Studio (Designer Edition requise pour le SVG)**.
   **Vérifier immédiatement le témoin : le rectangle gris doit mesurer 50,0 mm de
   large** (panneau Transform). S'il fait 37,5 mm → le fichier a été ré-enregistré
   en 96 dpi (Inkscape…) : régénérer, ou remettre à l'échelle ×133,333 %.
3. Mise en page A4 → **activer les repères d'alignement (Type 1)** dans Studio.
   Les zones hachurées apparaissent aux coins — nos poses les évitent déjà
   (réserves de 25 × 25 mm). Ne rien déplacer dans ces zones.
4. **Imprimer depuis Studio** (ou Fichier → Imprimer → PDF, puis imprimeur externe
   **à 100 % taille réelle** — consigne explicite à donner). Les repères doivent
   figurer sur l'impression : ils ne sont PAS dans notre SVG, c'est Studio qui les
   génère et les lit.
5. Charger la planche imprimée, lancer la lecture des repères, puis la découpe :
   - couleur de trait **rouge** = coupe (kiss-cut) ; **gris/orange** (guides, témoin)
     = « No Cut » ou supprimer le calque `guides` avant l'envoi.
   - préréglage kiss-cut de départ : **profondeur 4 / force 9 / 2 passes** —
     à ajuster sur une chute à chaque nouveau lot de matière (le dos siliconé
     doit rester intact).
6. Première fois : faire la **calibration print & cut** officielle de la machine,
   et une répétition générale sur papier ordinaire avant la planche autocollante.

## Voie B — StickerApp (impression + découpe sous-traitées)

1. `python -m cardcut template` → placer le visuel dans le calque `artwork` du SVG
   (Illustrator/Affinity/Inkscape), jusqu'au **bord du fond perdu** (cadre bleu).
   Garder les éléments importants dans la **zone tranquille** (cadre vert, 2 mm).
2. Exporter le visuel seul en PNG 300–600 dpi, puis :
   `python -m cardcut compose --artwork visuel.png` → `out/final_stickerapp.pdf`
   (le tracé de coupe spot `CutContour` est dessiné au-dessus, en surimpression).
3. Commander sur stickerapp.fr (découpes intérieures officiellement supportées,
   MOQ 29). **Ajouter en commentaire de commande : « respecter exactement la
   cutline du fichier, ne pas régénérer de contour »** — sinon leur tracé
   automatique peut s'écarter de ~2 mm du visuel. Demander le BAT.
4. Vérification du PDF dans Illustrator : nuancier → ton direct « CutContour » ;
   Fenêtre → Attributs → surimpression du contour cochée ; Aperçu des séparations →
   la plaque CutContour isole le tracé.

## Pièges connus

| Piège | Parade |
|---|---|
| SVG ré-enregistré par Inkscape avant import Studio | 96 dpi → tout à 75 % ; témoin à 37,5 mm = symptôme. Toujours utiliser le SVG généré tel quel |
| « Ajuster à la page » à l'impression | Cotes fausses. Toujours 100 % / taille réelle |
| Ton direct renommé (`cutcontour`, `Cut Contour`…) | Le RIP ne coupe pas. Nom exact `CutContour`, sensible à la casse (self-check le vérifie) |
| DXF | Perd l'échelle dans Studio — proscrit, rester en SVG |
| Lamination brillante / holographique | Le capteur optique Silhouette peut échouer. Préférer mat ou non laminé (sinon : Siser Juliet, caméra dans la tête, ~500–700 €) |
| Cartes embossées (numéros en relief) | Choisir un vinyle souple/conformable, pas un PP rigide ; marouflage soigné |
| Gap entre traits de coupe au lieu des boîtes de fond perdu | Chevauchement des visuels. `layouts.py` applique le gap aux boîtes de fond perdu (coupe-à-coupe = gap + 2×bleed) |
| Espacement fenêtre–bord < 6,35 mm | Refus Sticker Mule. Notre fenêtre est à 7,0 mm du bord gauche |
| `check` sans les options de génération | Fausses erreurs si out/ a été généré avec `--card`/`--window`/`--bleed` non défaut : repasser les mêmes options |

## Architecture du code

Tout est en **millimètres** en interne (origine haut-gauche, y vers le bas) ;
les conversions vivent uniquement dans les writers (`MM_TO_PT = 72/25.4`).
`geometry.py` est la source unique des tracés (arcs SVG `A` / Béziers PDF κ=0,5522847498).
Le flip d'axe y du PDF est confiné à `pdf_writer.py`. Les PDF sont écrits sans
compression pour que `selfcheck.py` puisse vérifier les octets (`/Separation`,
`/CutContour`, `/OP true`, MediaBox) sans parseur PDF.

## Matériel (décisions d'achat, recherche 2026-08)

- **Silhouette Cameo 5/5α** : 330–370 € constatés (5α parfois ~290 €) + **Designer
  Edition** ~25–50 $ (achat unique, requis pour importer du SVG/PDF).
  Alternative budget : Portrait 4 (~180–200 €, repérage 3 points).
- Les imprimeurs FR classiques (Exaprint, Printoclock, Onlineprinters) **refusent
  les fenêtres intérieures** — d'où StickerApp (ou Sticker Mule : 1 fenêtre max,
  ≥ 6,35 mm des bords) pour la voie sous-traitée.
