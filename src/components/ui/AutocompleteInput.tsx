"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  readonly label?: string;
  readonly value: string;
  readonly onChangeValue: (value: string) => void;
  readonly suggestions: readonly string[];
  readonly placeholder?: string;
  readonly maxLength?: number;
};

const AutocompleteInput = ({
  label,
  value,
  onChangeValue,
  suggestions,
  placeholder,
  maxLength,
}: Props) => {
  const inputId = useId();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (value.trim() === "") return [];
    const query = value.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(query));
  }, [value, suggestions]);

  const handleSelect = useCallback(
    (selected: string) => {
      onChangeValue(selected);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onChangeValue],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const selected = filtered[activeIndex];
      if (selected !== undefined) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const showDropdown = isOpen && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      {label !== undefined && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => {
          onChangeValue(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (value.trim() !== "" && filtered.length > 0) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        className="h-10 rounded-lg border border-border-default bg-surface-overlay px-3 text-sm text-text-primary transition-colors placeholder:text-text-tertiary hover:border-border-strong focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border-default bg-surface-overlay py-1 shadow-lg"
        >
          {filtered.map((item, index) => (
            <li
              key={item}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              className={clsx(
                "cursor-pointer px-3 py-2 text-sm",
                index === activeIndex
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-primary hover:bg-surface-hover",
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
