"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Check, Copy } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { addToastAtom } from "@/stores/toastAtoms";
import type { CreatedApiKey } from "@/lib/auth";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

type Props = {
  readonly createdKey: CreatedApiKey | undefined;
  readonly onClose: () => void;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    return false;
  }
  const result = await navigator.clipboard
    .writeText(text)
    .catch((e: unknown) => e);
  return !(result instanceof Error);
};

const ApiKeyRevealSheet = ({ createdKey, onClose }: Props) => {
  const addToast = useSetAtom(addToastAtom);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (createdKey === undefined) return;
    const ok = await copyToClipboard(createdKey.key);
    if (ok) {
      setCopied(true);
      addToast({ message: t`API キーをコピーしました` });
    } else {
      addToast({ message: t`コピーに失敗しました。手動でコピーしてください` });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={createdKey !== undefined}
      onClose={handleClose}
      title={t`API キーを発行しました`}
    >
      {createdKey !== undefined && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            <Trans>
              この API
              キーは一度だけ表示されます。閉じる前に必ずコピーしてください。
            </Trans>
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-tertiary">
              {createdKey.name}
            </span>
            <code
              data-testid="api-key-value"
              className="break-all rounded-lg border border-border-default bg-primary-50 px-3 py-2 font-mono text-sm text-text-primary"
            >
              {createdKey.key}
            </code>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={handleCopy}
            aria-label={t`API キーをコピー`}
          >
            {copied ? (
              <>
                <Check className="size-4" />
                <Trans>コピー済み</Trans>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <Trans>コピー</Trans>
              </>
            )}
          </Button>
          <Button variant="primary" fullWidth onClick={handleClose}>
            <Trans>完了</Trans>
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};

export default ApiKeyRevealSheet;
