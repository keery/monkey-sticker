"use client";

import { useState } from "react";
import { registerAction } from "@/lib/auth-actions";
import { field, fieldLabel, btnPrimary, authLink, errorText } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";
import { LocaleLink } from "@/components/LocaleLink";

export function RegisterForm({
  next,
  defaultEmail = "",
}: {
  next?: string;
  defaultEmail?: string;
}) {
  const { dict } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password.length < 8) {
      setError(dict.account.errMinPassword);
      return;
    }
    setPending(true);
    setError(null);
    const res = await registerAction({ name, email, password }, next);
    setPending(false);
    if (!res.ok) {
      switch (res.code) {
        case "taken":
          setError(dict.account.errTaken);
          break;
        case "throttled":
          setError(dict.account.errThrottled);
          break;
        case "invalid":
        case "server":
          setError(dict.account.errServer);
          break;
        default:
          setError(dict.account.registerError);
      }
    }
  }

  return (
    <form className="space-y-4 text-left" onSubmit={onSubmit}>
      <div>
        <label className={fieldLabel} htmlFor="name">{dict.account.nameLabel}</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
          placeholder={dict.account.namePlaceholder}
        />
      </div>
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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          placeholder={dict.account.passwordMinPlaceholder}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "…" : dict.account.createMyAccount}
      </button>
      {error && <p role="alert" className={errorText}>{error}</p>}
      <p className="pt-1 text-sm text-ivory-dim">
        {dict.account.haveAccount}{" "}
        <LocaleLink
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className={authLink}
        >
          {dict.account.signIn}
        </LocaleLink>
      </p>
    </form>
  );
}
