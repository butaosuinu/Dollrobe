"use client";

import { Search } from "lucide-react";

type Props = {
  readonly value: string;
  readonly onChangeValue: (value: string) => void;
  readonly placeholder?: string;
};

const SearchInput = ({ value, onChangeValue, placeholder }: Props) => (
  <div className="relative flex-1">
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      className="h-10 w-full rounded-lg border border-border-default bg-surface-overlay pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
    />
  </div>
);

export default SearchInput;
