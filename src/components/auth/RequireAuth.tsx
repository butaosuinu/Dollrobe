"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";

type Props = {
  readonly children: ReactNode;
};

const RequireAuth = ({ children }: Props) => {
  const router = useRouter();
  const { user, isLoading } = useAtomValue(authSessionUnwrappedAtom);
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

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
    if (!isMounted || isLoading || user !== undefined) {
      return;
    }
    if (isOnline) {
      router.replace("/signin");
    }
  }, [isMounted, isLoading, user, isOnline, router]);

  if (!isMounted || isLoading) {
    return undefined;
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
