"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

const fieldClass =
  "rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-ivory placeholder:text-ivory-dim/70 outline-none focus:border-flame transition-colors";

export function ContactForm() {
  const { dict } = useI18n();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="mt-6 rounded-2xl border border-flame/40 bg-flame/10 text-ivory p-4 text-sm">
        {dict.faq.contact.success}
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <input required placeholder={dict.faq.contact.namePlaceholder} className={fieldClass} />
        <input required type="email" placeholder={dict.faq.contact.emailPlaceholder} className={fieldClass} />
      </div>
      <input placeholder={dict.faq.contact.orderPlaceholder} className={`w-full ${fieldClass}`} />
      <textarea
        required
        rows={5}
        placeholder={dict.faq.contact.messagePlaceholder}
        className={`w-full resize-y ${fieldClass}`}
      />
      <button
        type="submit"
        className="rounded-full bg-flame text-night px-8 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
      >
        {dict.faq.contact.submit}
      </button>
    </form>
  );
}
