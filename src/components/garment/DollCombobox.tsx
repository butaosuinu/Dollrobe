"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import type { Doll } from "@/types";

type Props = {
  readonly dolls: readonly Doll[];
  readonly selectedDollId: string | undefined;
  readonly onChangeDoll: (id: string | undefined) => void;
};

const matchesDollQuery = ({
  doll,
  query,
  sizeLabel,
}: {
  readonly doll: Doll;
  readonly query: string;
  readonly sizeLabel: string;
}): boolean => {
  const nameMatch = doll.name.toLowerCase().includes(query);
  const customizerMatch =
    doll.customizer?.toLowerCase().includes(query) === true;
  const sizeMatch = sizeLabel.toLowerCase().includes(query);
  return nameMatch || customizerMatch || sizeMatch;
};

type DollOptionProps = {
  readonly doll: Doll;
  readonly optionId: string;
  readonly isSelected: boolean;
  readonly isActive: boolean;
  readonly sizeLabel: string;
  readonly onSelect: (id: string) => void;
};

const DollOption = ({
  doll,
  optionId,
  isSelected,
  isActive,
  sizeLabel,
  onSelect,
}: DollOptionProps) => (
  <li
    id={optionId}
    role="option"
    aria-selected={isSelected}
    onPointerDown={(e) => {
      e.preventDefault();
      onSelect(doll.id);
    }}
    className={clsx(
      "flex cursor-pointer items-center gap-2 px-3 py-2",
      isActive
        ? "bg-primary-50 text-primary-700"
        : "text-text-primary hover:bg-primary-50",
    )}
  >
    {isSelected && <Check className="size-3.5 shrink-0 text-primary-500" />}
    <div className={clsx("flex flex-col", !isSelected && "ml-5.5")}>
      <span className="text-sm font-medium">{doll.name}</span>
      <span className="text-[11px] text-text-tertiary">
        {sizeLabel}
        {doll.customizer !== undefined && ` / ${doll.customizer}`}
      </span>
    </div>
  </li>
);

type DropdownListProps = {
  readonly listboxId: string;
  readonly filtered: readonly Doll[];
  readonly selectedDollId: string | undefined;
  readonly activeIndex: number;
  readonly searchQuery: string;
  readonly getSizeLabel: (doll: Doll) => string;
  readonly onSelect: (id: string | undefined) => void;
  readonly getOptionId: (index: number) => string;
};

const DropdownList = ({
  listboxId,
  filtered,
  selectedDollId,
  activeIndex,
  searchQuery,
  getSizeLabel,
  onSelect,
  getOptionId,
}: DropdownListProps) => (
  <ul
    id={listboxId}
    role="listbox"
    aria-label={t`ドール一覧`}
    className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border-default bg-surface-overlay py-1 shadow-lg"
  >
    <li
      id={getOptionId(0)}
      role="option"
      aria-selected={selectedDollId === undefined}
      onPointerDown={(e) => {
        e.preventDefault();
        onSelect(undefined);
      }}
      className={clsx(
        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
        activeIndex === 0
          ? "bg-primary-50 text-primary-700"
          : "text-text-primary hover:bg-primary-50",
      )}
    >
      {selectedDollId === undefined && (
        <Check className="size-3.5 shrink-0 text-primary-500" />
      )}
      <span
        className={clsx(
          "font-medium",
          selectedDollId !== undefined && "ml-5.5",
        )}
      >
        {t`全ドール`}
      </span>
    </li>
    {filtered.map((doll, index) => (
      <DollOption
        key={doll.id}
        doll={doll}
        optionId={getOptionId(index + 1)}
        isSelected={doll.id === selectedDollId}
        isActive={activeIndex === index + 1}
        sizeLabel={getSizeLabel(doll)}
        onSelect={(id) => onSelect(id)}
      />
    ))}
    {filtered.length === 0 && searchQuery.trim() !== "" && (
      <li className="px-3 py-2 text-sm text-text-tertiary">
        {t`該当するドールがありません`}
      </li>
    )}
  </ul>
);

const DollCombobox = ({ dolls, selectedDollId, onChangeDoll }: Props) => {
  const { i18n } = useLingui();
  const inputId = useId();
  const listboxId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const selectedDoll = dolls.find((d) => d.id === selectedDollId);

  const getSizeLabel = useCallback(
    (doll: Doll) => i18n._(DOLL_SIZE_LABEL[doll.bodySize]),
    [i18n],
  );

  const filtered = useMemo(() => {
    if (searchQuery.trim() === "") return dolls;
    const query = searchQuery.toLowerCase();
    return dolls.filter((doll) =>
      matchesDollQuery({ doll, query, sizeLabel: getSizeLabel(doll) }),
    );
  }, [dolls, searchQuery, getSizeLabel]);

  const displayValue = useMemo(() => {
    if (selectedDoll === undefined) return "";
    return `${selectedDoll.name} (${getSizeLabel(selectedDoll)})`;
  }, [selectedDoll, getSizeLabel]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setActiveIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (dollId: string | undefined) => {
      onChangeDoll(dollId);
      closeDropdown();
    },
    [onChangeDoll, closeDropdown],
  );

  const totalOptions = filtered.length + 1;

  const handleSelectByIndex = useCallback(
    (index: number) => {
      if (index === 0) {
        handleSelect(undefined);
        return;
      }
      const doll = filtered[index - 1];
      if (doll !== undefined) {
        handleSelect(doll.id);
      }
    },
    [filtered, handleSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery("");
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectByIndex(activeIndex);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  };

  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-label={t`ドールで絞り込み`}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? getOptionId(activeIndex) : undefined
          }
          aria-autocomplete="list"
          value={isOpen ? searchQuery : displayValue}
          placeholder={t`ドールを検索...`}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            }
            setActiveIndex(-1);
          }}
          onClick={() => {
            setIsOpen(true);
            setSearchQuery("");
            setActiveIndex(-1);
          }}
          onFocus={() => {
            clearTimeout(blurTimeoutRef.current);
            setIsOpen(true);
            setSearchQuery("");
            setActiveIndex(-1);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(closeDropdown, 150);
          }}
          onKeyDown={handleKeyDown}
          className="h-10 w-full rounded-lg border border-border-default bg-surface-overlay py-2 pl-3 pr-8 text-base text-text-primary transition-colors placeholder:text-text-tertiary hover:border-border-strong focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 lg:text-sm"
        />
        <ChevronDown
          className={clsx(
            "pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </div>
      {isOpen && (
        <DropdownList
          listboxId={listboxId}
          filtered={filtered}
          selectedDollId={selectedDollId}
          activeIndex={activeIndex}
          searchQuery={searchQuery}
          getSizeLabel={getSizeLabel}
          onSelect={handleSelect}
          getOptionId={getOptionId}
        />
      )}
    </div>
  );
};

export default DollCombobox;
