"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trans } from "@lingui/react/macro";
import LoginButton from "@/components/auth/LoginButton";
import Logo from "@/components/marketing/Logo";
import { getSession } from "@/lib/auth";

const DEFAULT_REDIRECT = "/dashboard";

const sanitize = (raw: string | null): string => {
  if (raw === null) return DEFAULT_REDIRECT;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_REDIRECT;
  return raw;
};

const LoginInner = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = sanitize(searchParams.get("redirect"));

  useEffect(() => {
    const state = { cancelled: false };
    const check = async () => {
      const session = await getSession().catch(() => undefined);
      if (state.cancelled) return;
      if (session?.data !== undefined) {
        router.replace(redirect);
      }
    };
    void check();
    return () => {
      state.cancelled = true;
    };
  }, [redirect, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface-base px-6 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80"
        aria-label="Doll Wardrobe"
      >
        <Logo size={48} />
        <span className="font-display text-xl font-bold">Doll Wardrobe</span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl bg-surface-raised p-8 shadow-sm">
        <h1 className="mb-2 text-center font-display text-2xl font-bold">
          <Trans>ログイン</Trans>
        </h1>
        <p className="mb-8 text-center text-sm text-text-secondary">
          <Trans>アカウントを作成してドール服管理を始めましょう</Trans>
        </p>

        <div className="flex flex-col gap-3">
          <LoginButton provider="google" callbackURL={redirect} />
          <LoginButton provider="twitter" callbackURL={redirect} />
        </div>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          <Trans>
            ログインすると利用規約とプライバシーポリシーに同意したものとみなされます
          </Trans>
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
      >
        <Trans>← サービス紹介に戻る</Trans>
      </Link>
    </main>
  );
};

const LoginPage = () => (
  <Suspense fallback={undefined}>
    <LoginInner />
  </Suspense>
);

export default LoginPage;
