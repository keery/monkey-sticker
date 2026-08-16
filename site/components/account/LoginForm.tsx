"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth-actions";
import { field, fieldLabel, btnPrimary, authLink, errorText } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";
import { LocaleLink } from "@/components/LocaleLink";

export function LoginForm({ next }: { next?: string }) {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    // Succès = redirection côté serveur ; on ne gère ici que l'échec.
    const res = await loginAction(email, password, next);
    setPending(false);
    if (!res.ok) {
      switch (res.code) {
        case "credentials":
          setError(dict.account.errCredentials);
          break;
        case "throttled":
          setError(dict.account.errThrottled);
          break;
        case "invalid":
        case "server":
          setError(dict.account.errServer);
          break;
        default:
          setError(dict.account.loginError);
      }
    }
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
      <div>
        <label className={fieldLabel} htmlFor="password">{dict.account.passwordLabel}</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          placeholder={dict.account.passwordPlaceholder}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "…" : dict.account.signIn}
      </button>
      {error && <p role="alert" className={errorText}>{error}</p>}
      <div className="flex items-center justify-between pt-1 text-sm">
        <LocaleLink href="/forgot-password" className={authLink}>{dict.account.forgotPassword}</LocaleLink>
        <LocaleLink
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className={authLink}
        >
          {dict.account.createAccount}
        </LocaleLink>
      </div>
    </form>
  );
}
