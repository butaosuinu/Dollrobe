"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Sparkles } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import AuthDivider from "@/components/auth/AuthDivider";
import LoginButton from "@/components/auth/LoginButton";
import SignUpForm from "@/components/auth/SignUpForm";

const SignUpPage = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAtomValue(authSessionUnwrappedAtom);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return undefined;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-5 pb-10 pt-6 lg:gap-8 lg:pt-10">
      <header className="flex flex-col items-center gap-2 pt-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-200">
          <Sparkles className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          <Trans>新しいアカウントを作る</Trans>
        </h1>
        <p className="text-sm text-text-secondary">
          <Trans>30 秒で、最初の引き出しを開けられます</Trans>
        </p>
      </header>

      <SignUpForm />

      <AuthDivider>
        <Trans>または</Trans>
      </AuthDivider>

      <div className="flex flex-col gap-2.5">
        <LoginButton provider="google" />
        <LoginButton provider="twitter" />
      </div>

      <p className="text-center text-sm text-text-secondary">
        <Trans>
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/signin"
            className="font-medium text-primary-600 underline-offset-4 hover:underline"
          >
            ログイン
          </Link>
        </Trans>
      </p>
    </div>
  );
};

export default SignUpPage;
