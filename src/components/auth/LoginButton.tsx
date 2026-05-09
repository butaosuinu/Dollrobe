"use client";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { signInSocial } from "@/lib/auth";
import Button from "@/components/ui/Button";

type Props = {
  readonly provider: "twitter" | "google";
  readonly callbackURL?: string;
};

const PROVIDER_LABEL = Object.freeze({
  twitter: msg`X (Twitter) でログイン`,
  google: msg`Google でログイン`,
});

// better-auth の callbackURL は絶対 URL にする必要がある（相対パスだと
// Workers 側 baseURL に解決されてしまう）。`//` 始まりの open redirect も弾く
const toAbsoluteCallback = (
  callbackURL: string | undefined,
): string | undefined => {
  if (callbackURL === undefined) return undefined;
  if (typeof window === "undefined") return callbackURL;
  if (!callbackURL.startsWith("/") || callbackURL.startsWith("//")) {
    return undefined;
  }
  return `${window.location.origin}${callbackURL}`;
};

const LoginButton = ({ provider, callbackURL }: Props) => {
  const { i18n } = useLingui();
  const handleLogin = async () => {
    const absoluteCallback = toAbsoluteCallback(callbackURL);
    const options =
      absoluteCallback === undefined
        ? { provider }
        : { provider, callbackURL: absoluteCallback };
    await signInSocial(options).catch((error: unknown) => {
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
