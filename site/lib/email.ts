// Envoi d'e-mail transactionnel via l'API HTTP de Resend (simple fetch, zéro
// dépendance npm). NE PAS importer côté client.
//
// Dégradation propre : sans RESEND_API_KEY / EMAIL_FROM, on écrit le lien dans
// les logs du serveur au lieu d'envoyer — le flux « mot de passe oublié »
// fonctionne donc en local sans fournisseur e-mail (même esprit que
// isStripeConfigured()).

function emailConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const cfg = emailConfig();
  if (!cfg) {
    console.info(`[email] (non configuré) lien de réinitialisation pour ${to} : ${resetUrl}`);
    return;
  }

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto">
      <h1 style="font-size:20px">Réinitialise ton mot de passe</h1>
      <p>Tu as demandé à réinitialiser ton mot de passe Monkey Sticker.
         Ce lien expire dans 1 heure.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}"
           style="background:#e8622a;color:#160f0b;text-decoration:none;
                  padding:12px 22px;border-radius:999px;font-weight:700">
          Choisir un nouveau mot de passe
        </a>
      </p>
      <p style="color:#888;font-size:13px">Si tu n'es pas à l'origine de cette
         demande, ignore simplement cet e-mail.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from,
        to,
        subject: "Réinitialise ton mot de passe — Monkey Sticker",
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] échec Resend (${res.status}) :`, await res.text());
    }
  } catch (e) {
    console.error("[email] envoi impossible :", e instanceof Error ? e.message : e);
  }
}
