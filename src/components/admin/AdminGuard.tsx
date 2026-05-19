"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import { USER_ROLE } from "@/lib/auth";

type Props = {
  readonly children: ReactNode;
};

// /admin 配下の UX ガード。真の防御は Workers 側の adminProcedure が握っている。
// 未認証 → /signin、role!="admin" or frozen → /dashboard へリダイレクト。
const AdminGuard = ({ children }: Props) => {
  const router = useRouter();
  const { user, isLoading, hasError } = useAtomValue(authSessionUnwrappedAtom);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdmin = user?.role === USER_ROLE.ADMIN && !user.frozen;

  useEffect(() => {
    if (!isMounted || isLoading || hasError) return;
    if (user === undefined) {
      router.replace("/signin?redirect=%2Fadmin");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isMounted, isLoading, hasError, user, isAdmin, router]);

  if (!isMounted || isLoading) {
    return undefined;
  }

  if (hasError) {
    return (
      <div
        role="status"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-12 text-center"
      >
        <p className="text-base font-medium text-text-primary">
          <Trans>セッションを確認できませんでした</Trans>
        </p>
        <p className="text-sm text-text-secondary">
          <Trans>通信状況を確認してから再読み込みしてください</Trans>
        </p>
      </div>
    );
  }

  if (user === undefined || !isAdmin) {
    return (
      <div
        role="status"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-12 text-center"
      >
        <p className="text-base font-medium text-text-primary">
          <Trans>管理者権限が必要です</Trans>
        </p>
        <p className="text-sm text-text-secondary">
          <Trans>権限のあるアカウントで再ログインしてください</Trans>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
