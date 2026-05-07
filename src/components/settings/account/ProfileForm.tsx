"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { updateProfile, updateProfileSchema } from "@/lib/auth";
import { refreshAuthAtom } from "@/stores/authAtoms";
import { addToastAtom } from "@/stores/toastAtoms";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Props = {
  readonly currentUser: {
    readonly name: string;
    readonly email: string;
    readonly image: string | undefined;
  };
};

type FieldErrors = {
  readonly name: string | undefined;
  readonly image: string | undefined;
};

const EMPTY_ERRORS: FieldErrors = { name: undefined, image: undefined };

const ProfileForm = ({ currentUser }: Props) => {
  const refreshAuth = useSetAtom(refreshAuthAtom);
  const addToast = useSetAtom(addToastAtom);

  const [name, setName] = useState(currentUser.name);
  const [image, setImage] = useState(currentUser.image ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const isUnchanged =
    trimmedName === currentUser.name &&
    image.trim() === (currentUser.image ?? "");
  const isDisabled = isSubmitting || isUnchanged || trimmedName === "";

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDisabled) return;

    const parsed = updateProfileSchema.safeParse({
      name,
      image: image.trim() === "" ? undefined : image,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0] ?? undefined,
        image: flat.image?.[0] ?? undefined,
      });
      return;
    }

    setFieldErrors(EMPTY_ERRORS);
    setIsSubmitting(true);
    const failed = await updateProfile(parsed.data).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      addToast({ message: t`プロフィールの更新に失敗しました` });
      return;
    }

    refreshAuth();
    addToast({ message: t`プロフィールを更新しました` });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-4">
        {currentUser.image !== undefined ? (
          <img
            src={currentUser.image}
            alt=""
            className="size-16 rounded-2xl object-cover ring-1 ring-inset ring-primary-200"
          />
        ) : (
          <div
            className="flex size-16 items-center justify-center rounded-2xl bg-primary-100 font-display text-xl font-bold text-primary-700 ring-1 ring-inset ring-primary-200"
            aria-hidden
          >
            {currentUser.name.charAt(0)}
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-base font-bold text-text-primary">
            {currentUser.name}
          </p>
          <p className="text-xs text-text-tertiary">{currentUser.email}</p>
        </div>
      </div>

      <Input
        type="text"
        label={t`表示名`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        error={fieldErrors.name}
        required
      />
      <Input
        type="url"
        label={t`プロフィール画像 URL`}
        placeholder={t`https://...`}
        value={image}
        onChange={(e) => setImage(e.target.value)}
        error={fieldErrors.image}
      />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isDisabled}>
          <Trans>変更を保存</Trans>
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;
