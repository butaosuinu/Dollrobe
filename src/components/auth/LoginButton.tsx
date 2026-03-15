"use client";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { signInSocial } from "@/lib/auth";
import Button from "@/components/ui/Button";

type Props = {
  readonly provider: "twitter" | "google";
};

const PROVIDER_LABEL = Object.freeze({
  twitter: msg`X (Twitter) でログイン`,
  google: msg`Google でログイン`,
});

const LoginButton = ({ provider }: Props) => {
  const { i18n } = useLingui();
  const handleLogin = async () => {
    await signInSocial({ provider }).catch((error: unknown) => {
      // eslint-disable-next-line no-console -- OAuth errors should be visible for debugging
      console.error("ソーシャルログイン失敗:", error);
    });
  };

  return (
    <Button variant="secondary" size="lg" fullWidth onClick={handleLogin}>
      {i18n._(PROVIDER_LABEL[provider])}
    </Button>
  );
};

export default LoginButton;
