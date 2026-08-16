"use client";

import { logoutAction } from "@/lib/auth-actions";
import { btnGhost } from "@/lib/account-ui";
import { useI18n } from "@/lib/i18n/context";

export function LogoutButton() {
  const { dict } = useI18n();
  return (
    <form action={logoutAction}>
      <button type="submit" className={btnGhost}>
        {dict.account.logout}
      </button>
    </form>
  );
}
