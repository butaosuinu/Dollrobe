"use client";

import clsx from "clsx";

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
      <button
        key={option.value}
        type="button"
        onClick={() => onSelect(option.value)}
        className={clsx(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          value === option.value
            ? "bg-primary-500 text-text-inverse"
            : "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default ChipGroup;
