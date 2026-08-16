export const meta = {
  name: 'veille-designs',
  description: "Équipe d'agents de veille : trouve des idées de designs de stickers CB à fort potentiel de vente",
  whenToUse: "Quand on veut alimenter l'inbox /admin/ideas de la boutique en nouvelles idées de designs (trends, niches, saisonnier…)",
  phases: [
    { title: 'Scan', detail: '6 éclaireurs en parallèle — signaux avec preuve de traction' },
    { title: 'Idéation', detail: '4 idéateurs à mandats distincts → ~48 concepts' },
    { title: 'Présélection', detail: 'jury de 3 acheteurs, notation comparative calibrée + kill IP' },
    { title: 'Studio', detail: 'illustration SVG figurative + critique de désirabilité' },
    { title: 'Jury visuel', detail: 'notation sur le RENDU réel → sélection finale' },
    { title: 'Livraison', detail: 'fusion dédupliquée dans site/data/proposals.json' },
  ],
}

// args optionnels : { count?: number (idées livrées, défaut 8), focus?: string (axe imposé) }
const TARGET = (args && args.count) || 8
const FOCUS = (args && args.focus) || null
// Entonnoir : on génère beaucoup, on illustre le double de la cible, on livre la cible.
const N_ILLUS = Math.min(Math.max(TARGET * 2, 10), 16)
const GEN_COUNT = 12 // concepts par idéateur (× 4 idéateurs ≈ 48 concepts bruts)

const SITE_DIR = '/Users/guillaumeesnault/Documents/Projects/sticker-credit-card/site'
const PROPOSALS_FILE = `${SITE_DIR}/data/proposals.json`

// ── Grille de désirabilité : la définition PARTAGÉE de « ce qui se vend ». ──
// Injectée en idéation ET dans chaque jury pour aligner génération et jugement.
const RUBRIC = `GRILLE DE DÉSIRABILITÉ (un sticker CB qui se VEND, pas une idée « maligne ») :
1. LISIBLE À L'ÉCHELLE CARTE — le motif fonctionne sur 8,5 × 5,4 cm, reconnaissable en 1 seconde (aucun détail qui disparaît en petit).
2. A L'AIR CHER — donne l'impression d'une carte premium/custom, pas d'un autocollant à 2 €.
3. « ÇA C'EST MOI » POUR UNE TRIBU LARGE — appartenance forte ET audience suffisante (pas une private joke pour 500 personnes).
4. PHOTOGÉNIQUE AU PAIEMENT — donne envie d'être montré/filmé au moment de payer (moteur d'achat + UGC).
5. DÉSIR IMMÉDIAT, PAS VANNE À USAGE UNIQUE — on le veut sur SA carte pendant des mois, pas juste « ah ah » une fois. Un jeu de mots compris une seule fois qu'on ne collerait pas 2 ans = plafond 4/10.
DROPS TENDANCE : le périssable est assumé, MAIS la tendance doit avoir une traction d'ACHAT prouvée ailleurs (ventes / avis / bestseller de card skins), pas juste du buzz esthétique.`

// ── Calibrage anti-« tout le monde à 7,7 » : notation comparative à distribution forcée. ──
const CALIBRATION = `CALIBRAGE IMPITOYABLE (obligatoire) : tu notes en COMPARANT les idées entre elles, pas en isolation. Distribution forcée — médiane ≈ 4/10, au plus 20 % des idées peuvent dépasser 7, réserve 9-10 aux évidences absolues. Ancrages : 9 = « je l'achète maintenant ET je l'offre » ; 6 = « joli mais je scrolle » ; 4 = moyenne du marché ; 2 = malin sur le papier, personne ne colle ça sur sa carte. Interdiction de regrouper tout le monde autour de 7 : si tes notes se ressemblent toutes, c'est que tu n'as pas tranché.`

const CTX = `CONTEXTE BUSINESS : boutique française de stickers pour cartes bancaires (format exact carte, fenêtre puce prédécoupée, 11,99 €, cible 16-40 ans, vente en ligne France). La carte bancaire est un objet vu 10× par jour, très identitaire — les gens achètent ce qui exprime qui ils sont (passions, humour, esthétique, appartenance) ET ce qui a de l'allure au moment de payer.
CATALOGUE DÉJÀ COUVERT (ne pas re-proposer de quasi-doublon) : plage, palmiers, néon rose/vert, floral/hortensias/cerisier, marbre, or/noir, léopard/zèbre, camo urbain/forêt, racing, flammes, glitch, pixel, smiley, cœurs, terracotta/mint/pastels, cash/billets, japonisant/vague Hokusai, et récemment dentelle dark romance + flash tattoo old school.
STRATÉGIE ACTUELLE : on vise surtout des DROPS TENDANCE (lancer vite, quitte à ce que ce soit périssable) — donc timing et preuve de traction priment.
${RUBRIC}
IMPORTANT : commence par charger les outils web via ToolSearch "select:WebSearch,WebFetch". Cherche des infos FRAÎCHES (nous sommes en août 2026). Réponds en français. Ne modifie aucun fichier.${FOCUS ? `\nAXE IMPOSÉ PAR L'UTILISATEUR : ${FOCUS}` : ''}`

const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          description: { type: 'string', description: 'Le signal observé et pourquoi il peut se traduire en sticker de carte bancaire qui se vend' },
          preuve: { type: 'string', description: 'Données concrètes de TRACTION : ventes, nb d’avis, mention bestseller, volume de recherche, croissance de hashtag, vues. Un signal sans preuve de traction ne compte pas.' },
          source_url: { type: 'string' },
          force: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['titre', 'description', 'preuve', 'force'],
      },
    },
  },
  required: ['insights'],
}

const IDEAS_SCHEMA = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom commercial court du design, en français' },
          slug: { type: 'string', description: 'kebab-case, unique, sans accents' },
          pitch: { type: 'string', description: '1-2 phrases : le design et pourquoi on le VEUT sur sa carte' },
          audience: { type: 'string', description: 'Qui achète (persona court) — tribu identifiable ET assez large' },
          rationale: { type: 'string', description: "Pourquoi ça se vend : signal source + preuve de traction d'ACHAT + timing" },
          category: { type: 'string', description: 'Catégorie boutique suggérée (ex. Y2K, Sport 2026, Nostalgie…)' },
          theme: {
            type: 'object',
            properties: {
              pattern: { type: 'string', enum: ['gradient', 'waves', 'stripes', 'dots', 'rays', 'floral', 'grid', 'camo'] },
              colors: { type: 'array', items: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, minItems: 2, maxItems: 3 },
              dark: { type: 'boolean' },
            },
            required: ['pattern', 'colors', 'dark'],
          },
          needsCustomArt: { type: 'boolean', description: 'true si le rendu idéal exige un artwork dédié au-delà du générateur de motifs' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'slug', 'pitch', 'audience', 'rationale', 'category', 'theme', 'needsCustomArt', 'sources'],
      },
    },
  },
  required: ['ideas'],
}

// ── Phase 1 : Scan (barrière : l'idéation a besoin de TOUS les signaux) ──
const SCANNERS = [
  {
    key: 'esthetiques',
    prompt: `${CTX}
TU ES L'ÉCLAIREUR ESTHÉTIQUES. Cherche les courants esthétiques qui montent en 2026 (TikTok/Pinterest/Instagram : « -core », palettes, matières, typographies). Pour chaque courant : preuve de traction (recherches, hashtags, articles récents) ET indice que ça se traduit en achat d'objet, pas seulement en saves. Vise 6-8 insights.`,
  },
  {
    key: 'viral',
    prompt: `${CTX}
TU ES L'ÉCLAIREUR VIRAL & TRENDS. Cherche ce qui est viral ou le sera dans les 3-6 prochains mois : memes durables, phénomènes TikTok, sorties culturelles majeures (films, séries, jeux, albums) fin 2026, événements (sport, culture). Signale quand un sujet est une marque déposée (inspiration générique seulement). Privilégie les trends dont on voit DÉJÀ des produits dérivés se vendre. Vise 6-8 insights.`,
  },
  {
    key: 'marche',
    prompt: `${CTX}
TU ES L'ÉCLAIREUR MARCHÉ — LE PLUS IMPORTANT pour une stratégie de drops. Analyse ce qui se VEND déjà : bestsellers des vendeurs de card skins/stickers CB (PettyPurse, CUCU Covers, Etsy « credit card skin », Amazon, TikTok Shop, StickerApp…), thèmes récurrents, avis clients (ce que les gens adorent/regrettent), trous dans l'offre. Chaque insight DOIT porter une preuve de vente chiffrée (nb d'avis, « bestseller », volume estimé). Vise 6-8 insights.`,
  },
  {
    key: 'niches',
    prompt: `${CTX}
TU ES L'ÉCLAIREUR NICHES & COMMUNAUTÉS. Cherche des communautés à forte identité, pouvoir d'achat ET taille suffisante, mal servies : gaming rétro, astrologie, K-pop/J-pop, running, moto, tatouage, plantes, pêche, jardinage, crypto, BD/manga, métal, techno… Écarte les niches trop petites (< quelques centaines de milliers de personnes en France). Qu'est-ce qui ferait dire « c'est exactement moi » ? Vise 6-8 insights.`,
  },
  {
    key: 'france',
    prompt: `${CTX}
TU ES L'ÉCLAIREUR FRANCE. Angles spécifiquement français : humour FR, nostalgie (années 90-2000 françaises), culture régionale, gastronomie, expressions cultes, actualité positive française 2026. Ce qui se vend en produits dérivés FR (marchés créateurs, Etsy France). Vise 6-8 insights avec un indice de traction chacun.`,
  },
  {
    key: 'electron-libre',
    prompt: `${CTX}
TU ES L'ÉLECTRON LIBRE. Explore des angles inattendus MAIS défendables : objets du quotidien détournés, esthétiques d'autres industries (billets, cartes d'embarquement, tickets vintage, VHS, Minitel…), phénomènes de société. Contrainte : chaque insight doit avoir AU MOINS un indice concret de traction (un produit similaire qui se vend, un hashtag qui monte). Pas de pure spéculation. Vise 6-8 insights.`,
  },
]

phase('Scan')
const scans = (await parallel(
  SCANNERS.map(s => () =>
    agent(s.prompt, { label: `scan:${s.key}`, phase: 'Scan', schema: SCAN_SCHEMA })
      .then(r => ({ key: s.key, insights: r ? r.insights : [] }))
  )
)).filter(Boolean)

const allInsights = scans.flatMap(s => s.insights.map(i => ({ ...i, scanner: s.key })))
log(`${allInsights.length} signaux collectés par ${scans.length} éclaireurs`)

// ── Phase 2 : Idéation — 4 idéateurs à mandats distincts (volume + diversité) ──
phase('Idéation')
const GENERATORS = [
  {
    key: 'trend-jacking',
    mandate: `TU ES L'IDÉATEUR TREND-JACKING. Traduis en design un trend qui SE VEND DÉJÀ ailleurs (bestseller de card skins / produit dérivé à fort volume). Priorité absolue : preuve d'achat. Reprends la mécanique gagnante, adapte-la au format carte FR.`,
  },
  {
    key: 'esthetique',
    mandate: `TU ES L'IDÉATEUR ESTHÉTIQUE. Le design doit être BEAU et photogénique avant tout — une carte qu'on veut sortir pour payer. Palette et motif au service d'un look premium immédiat. La désirabilité vient de l'allure, pas d'un concept.`,
  },
  {
    key: 'tribu',
    mandate: `TU ES L'IDÉATEUR TRIBU & FANDOM. Cible une communauté à forte identité en pic culturel fin 2026 (sortie, événement, saison). Le design doit faire « c'est exactement moi » — mais pour une tribu assez LARGE (pas une private joke de 500 personnes).`,
  },
  {
    key: 'humour',
    mandate: `TU ES L'IDÉATEUR HUMOUR & MÉTA. Angle drôle/partageable, MAIS règle stricte : la blague doit se comprendre en 1 seconde ET donner envie de garder le sticker des mois (pas une vanne à usage unique). Si tu n'en collerais pas toi-même une carte pendant 2 ans, jette l'idée.`,
  },
]

const genResults = (await parallel(GENERATORS.map(g => () =>
  agent(`${CTX}
${g.mandate}
Voici ${allInsights.length} signaux collectés par les éclaireurs :
${JSON.stringify(allInsights, null, 1)}

Produis ${GEN_COUNT} PROPOSITIONS CONCRÈTES de designs de stickers CB dans TON mandat. Règles :
- Applique la grille de désirabilité ci-dessus à CHAQUE idée (surtout : tribu large, air premium, pas vanne à usage unique).
- ZÉRO contrefaçon : pas de logos, personnages ou marques déposées — génériser l'inspiration (ex. « vitesse italienne rouge » et non une marque précise).
- Chaque idée doit avoir un theme exécutable par notre générateur SVG : pattern parmi gradient|waves|stripes|dots|rays|floral|grid|camo + 2-3 couleurs hex fidèles à l'esthétique + dark si fond sombre. Si l'idée mérite un artwork dédié, mets needsCustomArt=true (le theme sert alors d'aperçu d'ambiance).
- Évite les quasi-doublons du catalogue existant listé plus haut.
- slug en kebab-case, unique, sans accents.
Tu n'as pas besoin du web (sauf vérification ponctuelle d'un fait).`, { label: `idee:${g.key}`, phase: 'Idéation', schema: IDEAS_SCHEMA })
))).filter(Boolean)

// Dédup par slug entre les 4 idéateurs.
const seenSlug = new Set()
const ideas = genResults.flatMap(r => (r && r.ideas) || []).filter(i => {
  if (!i || !i.slug || seenSlug.has(i.slug)) return false
  seenSlug.add(i.slug)
  return true
})
log(`${ideas.length} concepts générés (dédupliqués) — présélection en cours`)

// ── Phase 3 : Présélection — jury de 3 acheteurs, NOTATION COMPARATIVE calibrée ──
// Chaque juré voit TOUS les concepts et les note les uns par rapport aux autres.
phase('Présélection')
const CONCEPT_JURY_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          desirabilite: { type: 'number', description: '0-10 selon la grille et le calibrage' },
          ip: { type: 'string', enum: ['ok', 'risque', 'bloquant'], description: 'risque de propriété intellectuelle / sujet toxique' },
          raison: { type: 'string', description: '1 phrase tranchée' },
        },
        required: ['slug', 'desirabilite', 'ip', 'raison'],
      },
    },
  },
  required: ['verdicts'],
}

const conceptCards = ideas.map(i => ({ slug: i.slug, name: i.name, pitch: i.pitch, audience: i.audience, category: i.category, theme: i.theme }))
const conceptJurors = (await parallel([0, 1, 2].map(n => () =>
  agent(`${CTX}
TU ES LE JURÉ ACHETEUR n°${n + 1}. On te donne TOUS les concepts d'un coup : ton travail est de les CLASSER les uns contre les autres selon la grille de désirabilité, PAS de les valider un par un.
${CALIBRATION}
Pour CHAQUE concept, donne desirabilite (0-10), un statut IP (ok / risque / bloquant : marque, personnage ou œuvre reconnaissable, ou sujet clivant/toxique), et 1 raison tranchée.
CONCEPTS :
${JSON.stringify(conceptCards, null, 1)}`, { label: `jury-concept:${n + 1}`, phase: 'Présélection', schema: CONCEPT_JURY_SCHEMA })
))).filter(Boolean)

// Agrégation par slug : moyenne de désirabilité, comptage des flags IP.
const agg = new Map()
for (const j of conceptJurors) {
  for (const v of (j.verdicts || [])) {
    if (!v || !v.slug) continue
    const e = agg.get(v.slug) || { des: [], blocks: 0, risky: 0, reasons: [] }
    if (typeof v.desirabilite === 'number') e.des.push(v.desirabilite)
    if (v.ip === 'bloquant') e.blocks++
    else if (v.ip === 'risque') e.risky++
    if (v.raison) e.reasons.push(v.raison)
    agg.set(v.slug, e)
  }
}

const preselected = ideas
  .map(idea => {
    const e = agg.get(idea.slug)
    if (!e || e.des.length === 0) return null
    const meanDes = Math.round((e.des.reduce((a, b) => a + b, 0) / e.des.length) * 10) / 10
    return { idea, meanDes, blocks: e.blocks, risky: e.risky, reasons: e.reasons }
  })
  .filter(Boolean)
  .filter(c => c.blocks < 2) // majorité de jurés « bloquant » => écarté (kill IP)
  .sort((a, b) => b.meanDes - a.meanDes)
  .slice(0, N_ILLUS)

log(`${preselected.length}/${ideas.length} concepts présélectionnés pour le studio (meilleure note ${preselected[0] ? preselected[0].meanDes : 'n/a'}, plus basse retenue ${preselected.length ? preselected[preselected.length - 1].meanDes : 'n/a'})`)

// ── Phase 4 : Studio — artwork SVG figuratif + critique de DÉSIRABILITÉ (pas juste technique) ──
phase('Studio')
const CRITIQUE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['keep', 'redo'] },
    feedback: { type: 'string' },
    desirabilite: { type: 'number', description: '0-10 : à quel point le RENDU donne envie de l’acheter (grille + calibrage)' },
  },
  required: ['verdict', 'feedback', 'desirabilite'],
}

const BRIEF = (p) => `Tu es un ILLUSTRATEUR VECTORIEL professionnel spécialisé stickers premium. Crée l'artwork du design :
- Nom : ${p.name} — Pitch : ${p.pitch} — Cible : ${p.audience}
- Palette de base : ${p.theme.colors.join(', ')} — ambiance : ${p.theme.pattern}
FICHIER À ÉCRIRE : ${SITE_DIR}/public/designs/${p.slug}.svg (crée le dossier si besoin).
TECHNIQUE (strict) : SVG autonome viewBox="0 0 856 540", plein format sans coins arrondis, aucune référence externe (pas d'<image> http ni police web), pas de script, < 60 Ko. La zone x de 70 à 230 / y de 160 à 320 sera découpée (fenêtre puce) : aucun élément important dedans.
ARTISTIQUE (crucial — c'est ce qui fait ACHETER) : FIGURATIF et « relatable » (objets/scènes reconnaissables du pitch), style flat illustration PREMIUM qui a l'air cher, LISIBLE à l'échelle d'une carte (8,5 cm — pas de détail qui disparaît), et photogénique. ZÉRO marque ou personnage déposé.
Après écriture, valide : python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('${SITE_DIR}/public/designs/${p.slug}.svg')". Retourne "OK ${p.slug}".`

const illustrated = await pipeline(
  preselected,
  c => agent(BRIEF(c.idea), { label: `illustre:${c.idea.slug}`, phase: 'Studio' }).then(() => c),
  async (c) => {
    const p = c.idea
    const critique = await agent(`Tu es le DIRECTEUR ARTISTIQUE. Lis ${SITE_DIR}/public/designs/${p.slug}.svg pour « ${p.name} » (pitch : ${p.pitch}). Si un moteur de rendu SVG est dispo (rsvg-convert, cairosvg ou resvg), rends le SVG en PNG dans /tmp et REGARDE l'image ; sinon juge depuis la source.
${RUBRIC}
${CALIBRATION}
Vérifie : XML valide viewBox 0 0 856 540 sans référence externe ; VRAIMENT figuratif et lisible à l'échelle carte (pas un fond décoré) ; rien d'important dans la zone puce x 70-230 / y 160-320 ; look premium. Donne verdict=redo (avec feedback actionnable) si un point technique échoue OU si desirabilite < 5. Renseigne desirabilite = à quel point le RENDU donne envie d'acheter. Ne modifie aucun fichier.`, { label: `critique:${p.slug}`, phase: 'Studio', schema: CRITIQUE_SCHEMA })
    if (critique && critique.verdict === 'redo') {
      await agent(`${BRIEF(p)}\n\nCORRECTION DEMANDÉE par le directeur artistique : ${critique.feedback}`, { label: `retouche:${p.slug}`, phase: 'Studio' })
    }
    return { ...c, image: `/designs/${p.slug}.svg`, studioScore: critique && typeof critique.desirabilite === 'number' ? critique.desirabilite : null, studioNote: critique ? critique.feedback : '' }
  }
)

const survivors = illustrated.filter(Boolean)
log(`${survivors.length} designs illustrés par le studio`)

// ── Phase 5 : Jury visuel — la sélection finale se fait sur le RENDU, pas sur le pitch ──
phase('Jury visuel')
const VISUAL_JURY_SCHEMA = {
  type: 'object',
  properties: {
    classement: {
      type: 'array',
      description: 'TOUS les designs, ordonnés du plus désirable au moins désirable',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          note: { type: 'number', description: '0-10 : désirabilité du rendu, calibrée' },
          avis: { type: 'string', description: '1 phrase sur le rendu' },
        },
        required: ['slug', 'note', 'avis'],
      },
    },
  },
  required: ['classement'],
}

const visualCards = survivors.map(c => ({ slug: c.idea.slug, name: c.idea.name, pitch: c.idea.pitch, fichier: `${SITE_DIR}/public${c.image}` }))
const visualJury = await agent(`Tu es le JURY VISUEL EN CHEF. Voici ${visualCards.length} designs déjà illustrés. Pour CHACUN, ouvre le fichier SVG ; si un moteur de rendu est dispo (rsvg-convert / cairosvg / resvg), rends-le en PNG dans /tmp et REGARDE l'image (c'est préférable), sinon juge depuis la source.
Ton job : CLASSER les ${visualCards.length} designs du plus désirable au moins désirable, en te basant sur ce qu'on VOIT (pas le concept).
${RUBRIC}
${CALIBRATION}
Retourne le classement complet avec une note (0-10) et un avis d'une phrase par design.
DESIGNS :
${JSON.stringify(visualCards, null, 1)}`, { label: 'jury-visuel', phase: 'Jury visuel', schema: VISUAL_JURY_SCHEMA })

const visualMap = new Map(((visualJury && visualJury.classement) || []).map(v => [v.slug, v]))

// Score final : 40 % concept (désirabilité de l'idée) + 60 % visuel (ce qui fait acheter).
// Fallback en cascade si un jury a manqué : visuel chef → studio → concept.
const finalScored = survivors
  .map(c => {
    const vj = visualMap.get(c.idea.slug)
    const visualFinal = vj && typeof vj.note === 'number'
      ? vj.note
      : (typeof c.studioScore === 'number' ? c.studioScore : c.meanDes)
    const score = Math.round((c.meanDes * 0.4 + visualFinal * 0.6) * 10) / 10
    const risqueScore = Math.max(0, Math.min(10, 10 - 3 * c.risky - 5 * c.blocks))
    return { c, score, visualFinal, risqueScore, visualAvis: vj ? vj.avis : c.studioNote }
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, TARGET)

const delivered = finalScored.map(({ c, score, risqueScore, visualAvis }) => ({
  ...c.idea,
  image: c.image,
  score,
  scoreDetail: {
    vente: c.meanDes,
    risque: risqueScore,
    avisVente: c.reasons.slice(0, 2).join(' · ') || '—',
    avisRisque: c.blocks ? 'Signalé bloquant par un juré IP' : (c.risky ? 'Risque IP à surveiller' : 'Aucun risque IP majeur'),
  },
  rationale: c.idea.rationale + (visualAvis ? ` — Jury visuel : ${visualAvis}` : ''),
}))

log(`${delivered.length} designs retenus après jury visuel (cible ${TARGET})`)

// ── Phase 6 : Livraison ──
phase('Livraison')
const delivery = await agent(`Tu es l'agent de LIVRAISON. Fusionne ces propositions dans le fichier ${PROPOSALS_FILE} :
${JSON.stringify(delivered, null, 1)}

PROCÉDURE STRICTE :
1. Lis le fichier s'il existe (sinon pars d'un tableau vide). Crée le dossier si besoin.
2. Ignore toute proposition dont le slug existe déjà dans le fichier (quel que soit son statut) — compte-les comme doublons.
3. Pour chaque nouvelle proposition, ajoute un objet : { id: slug, name, slug, pitch, audience, rationale, category, theme, image, needsCustomArt, score, scoreDetail, sources, status: "new", createdAt: date ISO du jour (commande \`date -u +%Y-%m-%dT%H:%M:%SZ\`) }. Pour le champ image : garde-le seulement si le fichier ${SITE_DIR}/public/designs/<slug>.svg existe et est un XML valide, sinon omets-le.
4. Écris le fichier en JSON indenté 2 espaces, puis VALIDE-LE en le relisant avec \`python3 -c "import json; json.load(open('${PROPOSALS_FILE}'))"\`.
5. Synchronise la base (source de vérité lue par /admin/ideas) : exécute \`cd ${SITE_DIR} && npm run db:import proposals\`. L'import ajoute uniquement les nouvelles idées, sans écraser le statut de celles déjà traitées.
6. Ne touche à AUCUN autre fichier.
Retourne exactement : { added: N, duplicates: N, total: N } en JSON brut.`, { label: 'livraison', phase: 'Livraison' })

return {
  resume: `${delivered.length} propositions livrées sur ${ideas.length} concepts générés (${allInsights.length} signaux, entonnoir ${ideas.length}→${preselected.length}→${TARGET})`,
  livraison: delivery,
  propositions: delivered.map(k => ({ name: k.name, slug: k.slug, score: k.score, category: k.category, pitch: k.pitch })),
}
