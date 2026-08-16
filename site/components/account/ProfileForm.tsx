"use client";

import { useState } from "react";
import { updateProfileAction } from "@/lib/auth-actions";
import { field, fieldLabel, btnPrimary, errorText } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";

export function ProfileForm({ initialName }: { initialName: string }) {
  const { dict } = useI18n();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await updateProfileAction(name);
    setPending(false);
    if (res.ok) setSaved(true);
    else setError(dict.account.profileError);
  }

  return (
    <form className="space-y-4 text-left" onSubmit={onSubmit}>
      <div>
        <label className={fieldLabel} htmlFor="name">{dict.account.profileNameLabel}</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className={field}
          placeholder={dict.account.namePlaceholder}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "…" : dict.account.save}
      </button>
      {saved && <p className="mt-3 text-sm text-emerald-400">{dict.account.saved}</p>}
      {error && <p role="alert" className={errorText}>{error}</p>}
    </form>
  );
}
