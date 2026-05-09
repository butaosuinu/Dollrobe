"use client";

import Chip from "@/components/ui/Chip";

type ChipOption<T extends string> = {
  readonly value: T;
  readonly label: React.ReactNode;
};

type Props<T extends string> = {
  readonly options: ReadonlyArray<ChipOption<T>>;
  readonly value: T;
  readonly onSelect: (value: T) => void;
};

const ChipGroup = <T extends string>({
  options,
  value,
  onSelect,
}: Props<T>) => (
  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
    {options.map((option) => (
      <div key={option.value} className="shrink-0">
        <Chip
          selected={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Chip>
      </div>
    ))}
  </div>
);

export default ChipGroup;
