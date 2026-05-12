"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { createSignUpEmailSchema, signUpWithEmail } from "@/lib/auth";
import { refreshAuthAtom } from "@/stores/authAtoms";
import Button from "@/components/ui/Button";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Input from "@/components/ui/Input";

type FieldErrors = {
  readonly name: string | undefined;
  readonly email: string | undefined;
  readonly password: string | undefined;
  readonly passwordConfirm: string | undefined;
};

const EMPTY_ERRORS: FieldErrors = {
  name: undefined,
  email: undefined,
  password: undefined,
  passwordConfirm: undefined,
};

const SignUpForm = () => {
  const router = useRouter();
  const refreshAuth = useSetAtom(refreshAuthAtom);
  const { i18n } = useLingui();
  const schema = useMemo(() => createSignUpEmailSchema(i18n), [i18n]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const parsed = schema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
    });
    if (parsed.success) {
      setFieldErrors(EMPTY_ERRORS);
      return parsed.data;
    }
    const flat = parsed.error.flatten().fieldErrors;
    setFieldErrors({
      name: flat.name?.[0] ?? undefined,
      email: flat.email?.[0] ?? undefined,
      password: flat.password?.[0] ?? undefined,
      passwordConfirm: flat.passwordConfirm?.[0] ?? undefined,
    });
    return undefined;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const data = validate();
    if (data === undefined) {
      setSubmitError(undefined);
      return;
    }

    setSubmitError(undefined);
    setIsSubmitting(true);
    const failed = await signUpWithEmail({
      name: data.name,
      email: data.email,
      password: data.password,
    }).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      setSubmitError(
        t`アカウントを作成できませんでした。メールアドレスがすでに使われている可能性があります。`,
      );
      return;
    }

    await refreshAuth();
    router.replace("/");
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <Input
        type="text"
        label={t`表示名`}
        autoComplete="name"
        placeholder={t`例: ドリーラー`}
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        required
      />
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
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        aria-describedby="password-hint"
        required
      />
      <p id="password-hint" className="-mt-2 text-xs text-text-tertiary">
        <Trans>8 文字以上。英数字を含めると安全です。</Trans>
      </p>
      <Input
        type="password"
        label={t`パスワード（確認）`}
        autoComplete="new-password"
        placeholder="••••••••"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        error={fieldErrors.passwordConfirm}
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
        {isSubmitting ? <Trans>登録中…</Trans> : <Trans>アカウント作成</Trans>}
      </Button>
    </form>
  );
};

export default SignUpForm;
