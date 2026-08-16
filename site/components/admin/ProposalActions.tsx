"use client";

import { dismissProposalAction, restoreProposalAction } from "@/lib/admin-actions";
import { btnGhostSm } from "@/lib/admin-ui";

export function DismissButton({ id }: { id: string }) {
  return (
    <form action={dismissProposalAction.bind(null, id)}>
      <button type="submit" className={btnGhostSm}>
        Écarter
      </button>
    </form>
  );
}

export function RestoreButton({ id }: { id: string }) {
  return (
    <form action={restoreProposalAction.bind(null, id)}>
      <button type="submit" className={btnGhostSm}>
        Restaurer
      </button>
    </form>
  );
}
