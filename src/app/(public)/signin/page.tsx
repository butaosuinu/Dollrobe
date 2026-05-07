"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Shirt } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { authSessionUnwrappedAtom } from "@/stores/authAtoms";
import AuthDivider from "@/components/auth/AuthDivider";
import EmailPasswordForm from "@/components/auth/EmailPasswordForm";
import LoginButton from "@/components/auth/LoginButton";

const SignInPage = () => {
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
          <Shirt className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          <Trans>ドール服管理にログイン</Trans>
        </h1>
        <p className="text-sm text-text-secondary">
          <Trans>引き出しの中身を、いつでもどこでも</Trans>
        </p>
      </header>

      <EmailPasswordForm />

      <AuthDivider>
        <Trans>または</Trans>
      </AuthDivider>

      <div className="flex flex-col gap-2.5">
        <LoginButton provider="google" />
        <LoginButton provider="twitter" />
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
    </div>
  );
};

export default SignInPage;
