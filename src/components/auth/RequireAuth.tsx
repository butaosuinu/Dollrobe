"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";

// 認証ガードを通さないパス。`/` は LP（未ログイン訪問者向けランディング）。
// `/signin`, `/signup` は `src/app/(public)/` 配下のページ（route group の URL は
// 丸括弧を含まない）。新たな公開ページを追加したらここにも追記する
const PUBLIC_PATHS: ReadonlySet<string> = new Set(["/", "/signin", "/signup"]);

type Props = {
  readonly children: ReactNode;
};

const RequireAuth = ({ children }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading, hasError } = useAtomValue(authSessionUnwrappedAtom);
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const search = searchParams.toString();
  const redirectTo = search === "" ? pathname : `${pathname}?${search}`;

  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (
      isPublicPath ||
      !isMounted ||
      isLoading ||
      user !== undefined ||
      hasError
    ) {
      return;
    }
    if (isOnline) {
      router.replace(`/signin?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [
    isPublicPath,
    isMounted,
    isLoading,
    user,
    hasError,
    isOnline,
    redirectTo,
    router,
  ]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!isMounted || isLoading) {
    return undefined;
  }

  // セッション取得が transient エラー（バックエンド/ネットワーク不調）で失敗
  // した場合は「未認証」とは区別する。誤って /signin に飛ばさず、再試行を
  // 促す案内を表示する。
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

  if (user === undefined) {
    return isOnline ? undefined : (
      <div
        role="status"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-5 py-12 text-center"
      >
        <p className="text-base font-medium text-text-primary">
          <Trans>ログインが必要です</Trans>
        </p>
        <p className="text-sm text-text-secondary">
          <Trans>オンラインに戻るとログイン画面に進めます</Trans>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
