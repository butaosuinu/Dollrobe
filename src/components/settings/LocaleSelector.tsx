"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { t } from "@lingui/core/macro";
import { localeAtom, setLocaleAtom } from "@/i18n/localeAtom";
import {
  SUPPORTED_LOCALES,
  LOCALE_DISPLAY_NAME,
  type Locale,
} from "@/i18n/types";
import clsx from "clsx";
import IconButton from "@/components/ui/IconButton";

const LocaleSelector = () => {
  const currentLocale = useAtomValue(localeAtom);
  const changeLocale = useSetAtom(setLocaleAtom);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (
        ref.current !== null &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleSelect = (locale: Locale) => {
    changeLocale(locale);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon={Globe}
        label={t`言語`}
        size="md"
        onClick={() => setIsOpen((prev) => !prev)}
      />

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-border-default bg-surface-overlay shadow-md">
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={clsx(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-primary-50",
                currentLocale === locale
                  ? "font-bold text-primary-600"
                  : "text-text-primary",
              )}
            >
              {LOCALE_DISPLAY_NAME[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocaleSelector;
