"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: React.ReactNode;
};

const BottomSheet = ({ isOpen, onClose, title, children }: Props) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/30 animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={clsx(
          "relative w-full max-h-[85dvh] rounded-t-2xl bg-surface-overlay shadow-lg",
          "animate-[slide-up_0.3s_ease-out]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-8 rounded-full bg-border-strong" />
        </div>
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-border-default px-4 pb-3">
            <h3 className="font-display text-base font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-primary-50"
              aria-label="閉じる"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-4 pb-8 pt-3">{children}</div>
      </div>
    </div>
  );
};

export default BottomSheet;
