import { formatDistanceToNow, format } from "date-fns";
import { ja, enUS, ko, zhCN } from "date-fns/locale";
import type { Locale } from "@/i18n/types";

const DATE_FNS_LOCALE_MAP = Object.freeze({
  ja,
  en: enUS,
  ko,
  zh: zhCN,
} as const);

const getDateFnsLocale = (locale: Locale) => DATE_FNS_LOCALE_MAP[locale];

export const formatRelativeDays = ({
  timestamp,
  locale,
}: {
  readonly timestamp: number;
  readonly locale: Locale;
}): string =>
  formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: getDateFnsLocale(locale),
  });

export const formatDateTime = ({
  timestamp,
  locale,
}: {
  readonly timestamp: number;
  readonly locale: Locale;
}): string => {
  const pattern = locale === "en" ? "MMM d, yyyy HH:mm" : "yyyy/MM/dd HH:mm";
  return format(new Date(timestamp), pattern, {
    locale: getDateFnsLocale(locale),
  });
};

export const formatDate = ({
  timestamp,
  locale,
}: {
  readonly timestamp: number;
  readonly locale: Locale;
}): string => {
  const pattern = locale === "en" ? "MMM d, yyyy" : "yyyy/MM/dd";
  return format(new Date(timestamp), pattern, {
    locale: getDateFnsLocale(locale),
  });
};
