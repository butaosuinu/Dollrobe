"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { LogOut, Settings } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";
import { authSessionUnwrappedAtom, signOutAtom } from "@/stores/authAtoms";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import IconButton, { iconButtonClassName } from "@/components/ui/IconButton";
import { buttonClassName } from "@/components/ui/Button";

const UserMenu = () => {
  const { t } = useLingui();
  const authState = useAtomValue(authSessionUnwrappedAtom);
  const signOut = useSetAtom(signOutAtom);
  const [isMounted, setIsMounted] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || authState.isLoading) {
    return undefined;
  }

  if (authState.user === undefined) {
    return (
      <Link
        href="/signin"
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        <Trans>ログイン</Trans>
      </Link>
    );
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
        href="/settings/account"
        aria-label={t`設定`}
        className={iconButtonClassName({ size: "sm" })}
      >
        <Settings className="size-4" />
      </Link>
      <IconButton
        icon={LogOut}
        label={t`ログアウト`}
        size="sm"
        onClick={() => setIsConfirmOpen(true)}
      />
      <ConfirmSheet
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          signOut();
        }}
        title={t`ログアウトしますか？`}
        message={t`再びログインするまで、収納場所の確認や服の登録ができなくなります。`}
        confirmLabel={t`ログアウト`}
      />
    </div>
  );
};

export default UserMenu;
