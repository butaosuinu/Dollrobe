"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  changePassword,
  changePasswordSchema,
  setPassword,
  setPasswordSchema,
} from "@/lib/auth";
import { addToastAtom } from "@/stores/toastAtoms";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Props = {
  readonly hasPassword: boolean;
};

type FieldErrors = {
  readonly currentPassword: string | undefined;
  readonly newPassword: string | undefined;
  readonly newPasswordConfirm: string | undefined;
};

const EMPTY_ERRORS: FieldErrors = {
  currentPassword: undefined,
  newPassword: undefined,
  newPasswordConfirm: undefined,
};

const PasswordChangeForm = ({ hasPassword }: Props) => {
  const addToast = useSetAtom(addToastAtom);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled =
    isSubmitting ||
    newPassword === "" ||
    newPasswordConfirm === "" ||
    (hasPassword && currentPassword === "");

  const validate = () => {
    const parsed = hasPassword
      ? changePasswordSchema.safeParse({
          currentPassword,
          newPassword,
          newPasswordConfirm,
        })
      : setPasswordSchema.safeParse({ newPassword, newPasswordConfirm });
    if (parsed.success) {
      setFieldErrors(EMPTY_ERRORS);
      return parsed.data;
    }
    const flat: Record<string, readonly string[] | undefined> =
      parsed.error.flatten().fieldErrors;
    setFieldErrors({
      currentPassword: flat.currentPassword?.[0] ?? undefined,
      newPassword: flat.newPassword?.[0] ?? undefined,
      newPasswordConfirm: flat.newPasswordConfirm?.[0] ?? undefined,
    });
    return undefined;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled) return;

    const data = validate();
    if (data === undefined) return;

    setIsSubmitting(true);
    const failed = hasPassword
      ? await changePassword(data).catch(() => true)
      : await setPassword({
          newPassword: data.newPassword,
          newPasswordConfirm: data.newPasswordConfirm,
        }).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      addToast({
        message: hasPassword
          ? t`現在のパスワードが正しくないか、更新に失敗しました`
          : t`パスワードの設定に失敗しました`,
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    addToast({
      message: hasPassword
        ? t`パスワードを変更しました`
        : t`パスワードを設定しました`,
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {hasPassword ? (
        <Input
          type="password"
          label={t`現在のパスワード`}
          autoComplete="current-password"
          placeholder="••••••••"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={fieldErrors.currentPassword}
          required
        />
      ) : (
        <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs text-text-secondary">
          <Trans>
            ソーシャルログインで作成されたアカウントです。新しいパスワードを設定すると、メール
            + パスワードでもログインできるようになります。
          </Trans>
        </p>
      )}
      <Input
        type="password"
        label={hasPassword ? t`新しいパスワード` : t`パスワード`}
        autoComplete="new-password"
        placeholder="••••••••"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={fieldErrors.newPassword}
        required
      />
      <Input
        type="password"
        label={t`新しいパスワード（確認）`}
        autoComplete="new-password"
        placeholder="••••••••"
        value={newPasswordConfirm}
        onChange={(e) => setNewPasswordConfirm(e.target.value)}
        error={fieldErrors.newPasswordConfirm}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isDisabled}>
          {hasPassword ? (
            <Trans>パスワードを変更</Trans>
          ) : (
            <Trans>パスワードを設定</Trans>
          )}
        </Button>
      </div>
    </form>
  );
};

export default PasswordChangeForm;
