"use client";

import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly uncertainItemCount: number;
  readonly onConfirmAll: () => void;
};

const CheckoutConfirmSheet = ({
  isOpen,
  onClose,
  uncertainItemCount,
  onConfirmAll,
}: Props) => {
  const { i18n } = useLingui();
  const title = i18n._(msg`この引き出しの他の服、まだありますか？`);
  const description = i18n._(
    msg`${uncertainItemCount} 件が最後のスキャンから時間が経っています`,
  );

  const handleConfirmAll = () => {
    onConfirmAll();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{description}</p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" fullWidth onClick={handleConfirmAll}>
            <Trans>全部ある</Trans>
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            <Trans>スキップ</Trans>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default CheckoutConfirmSheet;
