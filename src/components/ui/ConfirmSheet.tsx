"use client";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly confirmVariant?: "primary" | "danger";
};

const ConfirmSheet = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmVariant = "primary",
}: Props) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
    <p className="mb-6 text-sm text-text-secondary">{message}</p>
    <div className="flex gap-3">
      <Button variant="ghost" fullWidth onClick={onClose}>
        キャンセル
      </Button>
      <Button variant={confirmVariant} fullWidth onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </BottomSheet>
);

export default ConfirmSheet;
