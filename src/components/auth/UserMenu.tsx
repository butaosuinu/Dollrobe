"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { LogOut, Settings } from "lucide-react";
import { t } from "@lingui/core/macro";
import { authSessionUnwrappedAtom, signOutAtom } from "@/stores/authAtoms";

const UserMenu = () => {
  const authState = useAtomValue(authSessionUnwrappedAtom);
  const signOut = useSetAtom(signOutAtom);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || authState.user === undefined) {
    return undefined;
  }

  const { user } = authState;

  return (
    <div className="flex items-center gap-2">
      {user.image !== undefined ? (
        <img src={user.image} alt={user.name} className="size-8 rounded-full" />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
          {user.name.charAt(0)}
        </div>
      )}
      <Link
        href="/settings/api-keys"
        className="p-1 text-text-tertiary hover:text-text-primary"
        aria-label={t`設定`}
      >
        <Settings className="size-4" />
      </Link>
      <button
        type="button"
        onClick={() => {
          signOut();
        }}
        className="p-1 text-text-tertiary hover:text-text-primary"
        aria-label={t`ログアウト`}
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
};

export default UserMenu;
