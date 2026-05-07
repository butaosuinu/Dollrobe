"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { changeEmail, changeEmailSchema } from "@/lib/auth";
import { refreshAuthAtom } from "@/stores/authAtoms";
import { addToastAtom } from "@/stores/toastAtoms";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Props = {
  readonly currentEmail: string;
};

const EmailChangeForm = ({ currentEmail }: Props) => {
  const refreshAuth = useSetAtom(refreshAuthAtom);
  const addToast = useSetAtom(addToastAtom);

  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = newEmail.trim();
  const isDisabled = isSubmitting || trimmed === "" || trimmed === currentEmail;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled) return;

    const parsed = changeEmailSchema.safeParse({ newEmail });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.newEmail?.[0] ?? undefined);
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    const failed = await changeEmail(parsed.data).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      addToast({ message: t`メールアドレスの変更に失敗しました` });
      return;
    }

    refreshAuth();
    setNewEmail("");
    addToast({ message: t`メールアドレスを変更しました` });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="rounded-lg bg-primary-50 px-3 py-2 text-xs font-mono text-text-primary">
        {currentEmail}
      </div>
      <Input
        type="email"
        label={t`新しいメールアドレス`}
        autoComplete="email"
        inputMode="email"
        placeholder={t`new@example.com`}
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        error={error}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isDisabled}>
          <Trans>メールアドレスを変更</Trans>
        </Button>
      </div>
    </form>
  );
};

export default EmailChangeForm;
