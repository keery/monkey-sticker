"use client";

import { useState } from "react";
import { subscribeAction } from "@/lib/newsletter-actions";
import { useI18n } from "@/lib/i18n/context";

export function NewsletterForm({
  compact = false,
  dark = false,
  source = "site",
}: {
  compact?: boolean;
  dark?: boolean;
  /** d'où vient l'inscription (home, footer…) — stocké avec l'email */
  source?: string;
}) {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDark = compact || dark;

  if (done) {
    return (
      <p className={`text-sm ${onDark ? "text-ivory-dim" : "text-neutral-700"} ${compact ? "mt-2" : "mt-4"}`}>
        {dict.newsletter.success}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await subscribeAction(email, source);
    setPending(false);
    if (res.ok) setDone(true);
    else setError(res.error ?? dict.newsletter.error);
  }

  return (
    <form
      className={`${compact ? "mt-2" : "mt-4 max-w-md mx-auto"}`}
      onSubmit={onSubmit}
    >
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.newsletter.placeholder}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm outline-none border min-w-0 ${
            onDark
              ? "bg-white/5 border-white/15 text-ivory placeholder:text-ivory-dim/60 focus:border-flame"
              : "bg-white border-neutral-300 focus:border-black"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame disabled:opacity-60 ${
            onDark ? "bg-flame text-night hover:bg-flame-deep" : "bg-black text-white hover:opacity-80"
          }`}
        >
          {pending ? dict.common.loading : dict.newsletter.submit}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
