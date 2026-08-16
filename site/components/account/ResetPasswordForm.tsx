"use client";

import { useState } from "react";
import { resetPasswordAction } from "@/lib/auth-actions";
import { field, fieldLabel, btnPrimary, errorText } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";

export function ResetPasswordForm({ token }: { token: string }) {
  const { dict } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password.length < 8) {
      setError(dict.account.errMinPassword);
      return;
    }
    if (password !== confirm) {
      setError(dict.account.errPasswordMismatch);
      return;
    }
    setPending(true);
    setError(null);
    // Succès = redirection vers /login?reset=1 côté serveur.
    const res = await resetPasswordAction(token, password);
    setPending(false);
    if (!res.ok) setError(dict.account.errServer);
  }

  return (
    <form className="space-y-4 text-left" onSubmit={onSubmit}>
      <div>
        <label className={fieldLabel} htmlFor="password">{dict.account.newPasswordLabel}</label>
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
      <div>
        <label className={fieldLabel} htmlFor="confirm">{dict.account.confirmPasswordLabel}</label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
          placeholder={dict.account.passwordPlaceholder}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "…" : dict.account.updatePassword}
      </button>
      {error && <p role="alert" className={errorText}>{error}</p>}
    </form>
  );
}
