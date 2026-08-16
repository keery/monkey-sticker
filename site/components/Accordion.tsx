"use client";

import { useState } from "react";

export interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

export function Accordion({
  items,
  firstOpen = false,
  tone = "light",
}: {
  items: AccordionItem[];
  firstOpen?: boolean;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState<number | null>(firstOpen ? 0 : null);
  const dark = tone === "dark";
  return (
    <div className={dark ? "divide-y divide-white/10 border-y border-white/10" : "divide-y divide-neutral-200 border-y border-neutral-200"}>
      {items.map((item, i) => (
        <div key={i}>
          <button
            className={`w-full flex items-center justify-between py-4 text-left font-semibold text-sm sm:text-base ${dark ? "text-ivory" : ""}`}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.title}
            <span className={`transition-transform ${open === i ? "rotate-45" : ""}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
          {open === i && (
            <div className={`pb-5 text-sm leading-relaxed ${dark ? "text-ivory-dim" : "text-neutral-600"}`}>{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}
