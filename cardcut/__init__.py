"""cardcut — générateur de die-lines pour stickers au format carte bancaire (ISO ID-1)
avec fenêtre découpée à l'emplacement de la puce EMV (ISO 7816-2).

Convention interne : toutes les cotes en millimètres, origine au coin haut-gauche,
axe y vers le bas. Les conversions d'unités vivent exclusivement dans les writers.
"""

MM_TO_PT = 72 / 25.4  # 1 mm en points PDF/SVG@72dpi — jamais de 96 dpi nulle part
