"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtomValue } from "jotai";
import { Shirt } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import AuthDivider from "@/components/auth/AuthDivider";
import EmailPasswordForm from "@/components/auth/EmailPasswordForm";
import LoginButton from "@/components/auth/LoginButton";

const DEFAULT_REDIRECT = "/";

const sanitizeRedirect = (raw: string | null): string => {
  if (raw === null) return DEFAULT_REDIRECT;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_REDIRECT;
  return raw;
};

const SignInInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeRedirect(searchParams.get("redirect"));
  const { isAuthenticated, isLoading } = useAtomValue(authSessionUnwrappedAtom);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isLoading, isAuthenticated, redirect, router]);

  if (isLoading || isAuthenticated) {
    return undefined;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-5 pb-10 pt-6 lg:gap-8 lg:pt-10">
      <header className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-200">
          <Shirt className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          <Trans>ドール服管理にログイン</Trans>
        </h1>
        <p className="text-sm text-text-secondary">
          <Trans>引き出しの中身を、いつでもどこでも</Trans>
        </p>
      </header>

      <EmailPasswordForm redirect={redirect} />

      <AuthDivider>
        <Trans>または</Trans>
      </AuthDivider>

      <div className="flex flex-col gap-2.5">
        <LoginButton provider="google" callbackURL={redirect} />
        <LoginButton provider="twitter" callbackURL={redirect} />
      </div>

      <p className="text-center text-sm text-text-secondary">
        <Trans>
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-medium text-primary-600 underline-offset-4 hover:underline"
          >
            新規登録
          </Link>
        </Trans>
      </p>

      <Link
        href="/"
        className="text-center text-sm text-text-tertiary transition-colors hover:text-text-secondary"
      >
        <Trans>← サービス紹介に戻る</Trans>
      </Link>
    </div>
  );
};

const SignInPage = () => (
  <Suspense fallback={undefined}>
    <SignInInner />
  </Suspense>
);

export default SignInPage;
