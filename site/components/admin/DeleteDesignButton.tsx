"use client";

import { deleteDesignAction } from "@/lib/admin-actions";
import { btnDangerSm } from "@/lib/admin-ui";

export function DeleteDesignButton({ handle, name }: { handle: string; name: string }) {
  return (
    <form
      action={deleteDesignAction.bind(null, handle)}
      onSubmit={(e) => {
        if (!confirm(`Supprimer le design « ${name} » ? Cette action est définitive.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" aria-label={`Supprimer ${name}`} title="Supprimer" className={btnDangerSm}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
        </svg>
      </button>
    </form>
  );
}
