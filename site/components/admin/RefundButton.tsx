"use client";

// Bouton de remboursement (admin). Confirme, appelle l'action serveur qui
// rembourse via Stripe et bascule la commande en « refunded », puis affiche une
// erreur éventuelle. Le webhook charge.refunded ferait la même bascule si le
// remboursement était fait depuis le Dashboard.

import { useState, useTransition } from "react";
import { refundOrderAction } from "@/lib/order-actions";
import { btnDangerSm } from "@/lib/admin-ui";

export function RefundButton({ id, amount }: { id: string; amount: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={btnDangerSm}
        onClick={() => {
          if (!confirm(`Rembourser la commande ${id} (${amount}) ? Le client sera recrédité.`)) return;
          setErr(null);
          start(async () => {
            const res = await refundOrderAction(id);
            if (!res.ok) setErr(res.error ?? "Échec du remboursement.");
          });
        }}
      >
        {pending ? "Remboursement…" : "Rembourser"}
      </button>
      {err && <span className="text-[11px] text-rose-300">{err}</span>}
    </span>
  );
}
