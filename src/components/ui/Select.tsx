import clsx from "clsx";
import { ChevronDown } from "lucide-react";

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type Props = {
  readonly label?: string;
  readonly options: readonly SelectOption[];
  readonly error?: string;
  readonly placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className">;

const Select = ({ label, options, error, placeholder, id, ...rest }: Props) => {
  const selectId = id ?? label?.replace(/\s+/gu, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1.5">
      {label !== undefined && (
        <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={clsx(
            "h-10 w-full appearance-none rounded-lg border bg-surface-overlay px-3 pr-8 text-sm text-text-primary transition-colors",
            "focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100",
            error === undefined
              ? "border-border-default hover:border-border-strong"
              : "border-danger",
          )}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
      </div>
      {error !== undefined && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

export default Select;
