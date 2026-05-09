"use client";

import { SlidersHorizontal } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import Button from "@/components/ui/Button";

type Props = {
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly activeCount: number;
};

const FilterToggleButton = ({ isOpen, onToggle, activeCount }: Props) => {
  const isActive = isOpen || activeCount > 0;
  return (
    <Button
      variant={isActive ? "secondary" : "outline"}
      size="md"
      onClick={onToggle}
    >
      <SlidersHorizontal className="size-4" />
      <Trans>フィルター</Trans>
      {activeCount > 0 && (
        <span className="flex size-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-text-inverse">
          {activeCount}
        </span>
      )}
    </Button>
  );
};

export default FilterToggleButton;
