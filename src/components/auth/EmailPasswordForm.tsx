"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { signInEmailSchema, signInWithEmail } from "@/lib/auth";
import { refreshAuthAtom } from "@/stores/authAtoms";
import Button from "@/components/ui/Button";
import ErrorAlert from "@/components/ui/ErrorAlert";
import FormShell from "@/components/ui/FormShell";
import Input from "@/components/ui/Input";

type FieldErrors = {
  readonly email: string | undefined;
  readonly password: string | undefined;
};

const EMPTY_ERRORS: FieldErrors = { email: undefined, password: undefined };

type Props = {
  readonly redirect?: string;
};

const EmailPasswordForm = ({ redirect }: Props = {}) => {
  const router = useRouter();
  const refreshAuth = useSetAtom(refreshAuthAtom);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsed = signInEmailSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0] ?? undefined,
        password: flat.password?.[0] ?? undefined,
      });
      setSubmitError(undefined);
      return;
    }

    setFieldErrors(EMPTY_ERRORS);
    setSubmitError(undefined);
    setIsSubmitting(true);
    const failed = await signInWithEmail(parsed.data).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      setSubmitError(t`メールアドレスまたはパスワードが正しくありません`);
      return;
    }

    await refreshAuth();
    router.replace(redirect ?? "/");
  };

  return (
    <FormShell gap="md" onSubmit={handleSubmit} noValidate>
      <Input
        type="email"
        label={t`メールアドレス`}
        autoComplete="email"
        inputMode="email"
        placeholder={t`you@example.com`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />
      <Input
        type="password"
        label={t`パスワード`}
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
      />
      {submitError !== undefined && <ErrorAlert>{submitError}</ErrorAlert>}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={isSubmitting}
      >
        {isSubmitting ? <Trans>ログイン中…</Trans> : <Trans>ログイン</Trans>}
      </Button>
    </FormShell>
  );
};

export default EmailPasswordForm;
