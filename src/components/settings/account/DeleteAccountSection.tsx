"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { AlertTriangle } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { deleteAccount } from "@/lib/auth";
import { refreshAuthAtom } from "@/stores/authAtoms";
import { addToastAtom } from "@/stores/toastAtoms";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Props = {
  readonly currentEmail: string;
};

const DeleteAccountSection = ({ currentEmail }: Props) => {
  const router = useRouter();
  const refreshAuth = useSetAtom(refreshAuthAtom);
  const addToast = useSetAtom(addToastAtom);

  const [isOpen, setIsOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMatch = confirmEmail === currentEmail;
  const isDisabled = !isMatch || isSubmitting;

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmEmail("");
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (isDisabled) return;
    setIsSubmitting(true);
    const failed = await deleteAccount({ confirmEmail }).catch(() => true);
    setIsSubmitting(false);

    if (failed === true) {
      addToast({ message: t`アカウントの削除に失敗しました` });
      return;
    }

    refreshAuth();
    router.replace("/signin");
  };

  return (
    <section
      aria-labelledby="danger-zone-title"
      className="mt-4 rounded-2xl border border-danger/20 bg-red-50/40 p-5"
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-danger">
          <AlertTriangle className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <h3
            id="danger-zone-title"
            className="font-display text-base font-bold text-text-primary"
          >
            <Trans>アカウントを削除</Trans>
          </h3>
          <p className="text-xs text-text-tertiary">
            <Trans>
              登録した服・収納場所・コーデ・ドールはすべて削除され、復元できません。
            </Trans>
          </p>
        </div>
      </header>

      <Button variant="danger" size="md" onClick={() => setIsOpen(true)}>
        <Trans>アカウントを削除する</Trans>
      </Button>

      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={t`本当に削除しますか？`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <Trans>
              この操作は取り消せません。確認のため、登録メールアドレスを入力してください。
            </Trans>
          </p>
          <p className="rounded-lg bg-primary-50 px-3 py-2 font-mono text-xs text-text-primary">
            {currentEmail}
          </p>
          <Input
            type="email"
            label={t`メールアドレスを再入力`}
            autoComplete="off"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            error={
              confirmEmail !== "" && !isMatch
                ? t`メールアドレスが一致しません`
                : undefined
            }
          />
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={handleClose}>
              <Trans>キャンセル</Trans>
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={isDisabled}
              onClick={handleDelete}
            >
              <Trans>完全に削除</Trans>
            </Button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
};

export default DeleteAccountSection;
