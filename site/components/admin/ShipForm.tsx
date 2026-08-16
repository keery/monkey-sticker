"use client";

// Expédition d'une commande depuis l'atelier : saisie du n° de suivi (La Poste
// lettre suivie) au passage « imprimée → expédiée », puis correction éventuelle.
// Une commande déjà expédiée affiche son numéro (lien de suivi cliquable) avec
// un bouton « Modifier » qui ré-ouvre le champ.

import { useState, useTransition } from "react";
import { shipOrderAction } from "@/lib/order-actions";
import { trackingUrl } from "@/lib/tracking";
import { btnGhostSm } from "@/lib/admin-ui";

const inputCls =
  "w-36 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-ivory placeholder:text-ivory-dim/45 outline-none transition-colors focus:border-flame/60 focus:ring-2 focus:ring-flame/25";

export function ShipForm({
  id,
  trackingNumber,
  shipped,
}: {
  id: string;
  trackingNumber?: string;
  shipped: boolean;
}) {
  const [value, setValue] = useState(trackingNumber ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await shipOrderAction(id, value);
      if (res.ok) setEditing(false);
      else setErr(res.error ?? "Échec de l'expédition.");
    });
  }

  // Commande expédiée, hors édition : statut + numéro cliquable + « Modifier ».
  if (shipped && !editing) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300/80">
          ✓ Bouclée
        </span>
        {trackingNumber ? (
          <a
            href={trackingUrl(trackingNumber)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-flame underline decoration-flame/40 underline-offset-2 hover:decoration-flame"
            title="Suivre le colis sur laposte.fr"
          >
            {trackingNumber}
          </a>
        ) : (
          <span className="text-[11px] text-ivory-dim/50">Sans suivi</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[11px] text-ivory-dim/70 underline underline-offset-2 hover:text-ivory"
        >
          Modifier le suivi
        </button>
      </span>
    );
  }

  // Saisie : au passage à « expédiée », ou correction d'une commande expédiée.
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="N° de suivi"
          aria-label="Numéro de suivi"
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button type="button" disabled={pending} onClick={submit} className={btnGhostSm}>
          {pending ? "…" : shipped ? "Enregistrer" : "→ Expédiée"}
        </button>
        {shipped && (
          <button
            type="button"
            onClick={() => {
              setValue(trackingNumber ?? "");
              setEditing(false);
              setErr(null);
            }}
            className="text-[11px] text-ivory-dim/60 hover:text-ivory"
          >
            Annuler
          </button>
        )}
      </div>
      {err && <span className="text-[11px] text-rose-300">{err}</span>}
    </span>
  );
}
