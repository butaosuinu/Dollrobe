"use client";

import { SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";

type Props = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly activeCount: number;
};

const FilterToggleButton = ({ isOpen, onToggle, activeCount }: Props) => (
  <button
    type="button"
    onClick={onToggle}
    className={clsx(
      "relative flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
      isOpen || activeCount > 0
        ? "border-primary-400 bg-primary-50 text-primary-700"
        : "border-border-default bg-surface-overlay text-text-secondary hover:bg-surface-hover",
    )}
  >
    <SlidersHorizontal className="size-4" />
    <Trans>フィルター</Trans>
    {activeCount > 0 && (
      <span className="flex size-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-text-inverse">
        {activeCount}
      </span>
    )}
  </button>
);

export default FilterToggleButton;
