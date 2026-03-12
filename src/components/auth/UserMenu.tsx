"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { LogOut } from "lucide-react";
import { authStateAtom, signOutAtom } from "@/stores/authAtoms";

const UserMenu = () => {
  const authState = useAtomValue(authStateAtom);
  const signOut = useSetAtom(signOutAtom);

  if (authState.user === undefined) {
    return undefined;
  }

  return (
    <div className="flex items-center gap-2">
      {authState.user.image !== undefined ? (
        <img
          src={authState.user.image}
          alt={authState.user.name}
          className="size-8 rounded-full"
        />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
          {authState.user.name.charAt(0)}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          signOut();
        }}
        className="p-1 text-text-tertiary hover:text-text-primary"
        aria-label="ログアウト"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
};

export default UserMenu;
