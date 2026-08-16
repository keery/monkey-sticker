"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/lib/auth-actions";
import { field, fieldLabel, btnPrimary, authLink } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/interpolate";
import { LocaleLink } from "@/components/LocaleLink";

export function ForgotPasswordForm() {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    // Réponse toujours neutre (anti-énumération).
    await requestPasswordResetAction(email);
    setPending(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-left">
        <p className="text-sm text-ivory-dim">
          {interpolate(dict.account.forgotSent, { email })}
        </p>
        <p className="mt-6 text-sm">
          <LocaleLink href="/login" className={authLink}>{dict.account.backToLogin}</LocaleLink>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4 text-left" onSubmit={onSubmit}>
      <div>
        <label className={fieldLabel} htmlFor="email">{dict.account.emailLabel}</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
          placeholder={dict.account.emailPlaceholder}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "…" : dict.account.sendLink}
      </button>
      <p className="pt-1 text-sm">
        <LocaleLink href="/login" className={authLink}>{dict.account.backToLogin}</LocaleLink>
      </p>
    </form>
  );
}
