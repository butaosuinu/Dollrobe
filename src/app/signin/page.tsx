"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import LoginButton from "@/components/auth/LoginButton";
import PageHeader from "@/components/ui/PageHeader";

const SignInPage = () => {
  const router = useRouter();
  const authState = useAtomValue(authSessionUnwrappedAtom);
  const isAuthenticated = authState.user !== undefined;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return undefined;
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader title={t`ログイン`} backHref="/" backLabel={t`戻る`} />

      <p className="text-sm text-text-secondary">
        <Trans>
          ソーシャルアカウントでログインすると、QR/NFC スキャンの記録や API
          キーの発行など、すべての機能を利用できます。
        </Trans>
      </p>

      <div className="flex flex-col gap-3">
        <LoginButton provider="twitter" />
        <LoginButton provider="google" />
      </div>
    </div>
  );
};

export default SignInPage;
