"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Snowflake, Sun } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { I18n } from "@lingui/core";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import { addToastAtom } from "@/stores/toastAtoms";
import { freezeUserAtom, unfreezeUserAtom } from "@/stores/adminAtoms";

type Props = {
  readonly targetUserId: string;
  readonly frozen: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
};

type DialogCopy = {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly confirmVariant: "primary" | "danger";
  readonly errorMessage: string;
};

const buildDialogCopy = (i18n: I18n, frozen: boolean): DialogCopy =>
  frozen
    ? {
        title: i18n._(t`このユーザーを解凍しますか？`),
        message: i18n._(
          t`解凍すると再びログインできるようになります。データは保持されます。`,
        ),
        confirmLabel: i18n._(t`解凍する`),
        confirmVariant: "primary",
        errorMessage: i18n._(
          t`解凍に失敗しました。時間をおいて再度お試しください`,
        ),
      }
    : {
        title: i18n._(t`このユーザーを凍結しますか？`),
        message: i18n._(
          t`凍結すると現在のセッションは即時失効し、再ログインも拒否されます。データは保持されます。`,
        ),
        confirmLabel: i18n._(t`凍結する`),
        confirmVariant: "danger",
        errorMessage: i18n._(
          t`凍結に失敗しました。時間をおいて再度お試しください`,
        ),
      };

// mutate が reject されたかを判別する sentinel。await の値が success/failure
// どちらも void なので、try/catch を使わず .catch のみで判別するために使う。
const FAIL_SENTINEL = Symbol("user-freeze-fail");

const UserFreezeButton = ({
  targetUserId,
  frozen,
  disabled = false,
  disabledReason,
}: Props) => {
  const freezeUser = useSetAtom(freezeUserAtom);
  const unfreezeUser = useSetAtom(unfreezeUserAtom);
  const addToast = useSetAtom(addToastAtom);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { i18n } = useLingui();

  const copy = buildDialogCopy(i18n, frozen);

  const handleConfirm = async () => {
    const fire = frozen ? unfreezeUser : freezeUser;
    const outcome = await fire({ targetUserId }).catch(() => FAIL_SENTINEL);
    if (outcome === FAIL_SENTINEL) {
      addToast({ message: copy.errorMessage });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={frozen ? "secondary" : "danger"}
        size="md"
        onClick={() => setIsConfirmOpen(true)}
        disabled={disabled}
      >
        {frozen ? <Sun className="size-4" /> : <Snowflake className="size-4" />}
        {frozen ? <Trans>解凍する</Trans> : <Trans>凍結する</Trans>}
      </Button>
      {disabled && disabledReason !== undefined && (
        <p className="text-xs text-text-tertiary">{disabledReason}</p>
      )}
      <ConfirmSheet
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          void handleConfirm();
        }}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.confirmLabel}
        confirmVariant={copy.confirmVariant}
      />
    </div>
  );
};

export default UserFreezeButton;
