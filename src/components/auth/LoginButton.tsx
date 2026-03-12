"use client";

import { signInSocial } from "@/lib/auth";
import Button from "@/components/ui/Button";

type Props = {
  readonly provider: "twitter" | "google";
};

const PROVIDER_LABEL = Object.freeze({
  twitter: "X (Twitter) でログイン",
  google: "Google でログイン",
} as const);

const LoginButton = ({ provider }: Props) => {
  const handleLogin = async () => {
    await signInSocial({ provider }).catch(() => undefined);
  };

  return (
    <Button variant="secondary" size="lg" fullWidth onClick={handleLogin}>
      {PROVIDER_LABEL[provider]}
    </Button>
  );
};

export default LoginButton;
