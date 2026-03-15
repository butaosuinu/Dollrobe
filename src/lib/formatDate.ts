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

const DATE_FORMAT_PATTERN = Object.freeze({
  en: { dateTime: "MMM d, yyyy HH:mm", date: "MMM d, yyyy" },
  default: { dateTime: "yyyy/MM/dd HH:mm", date: "yyyy/MM/dd" },
} as const);

const getFormatPattern = (locale: Locale) =>
  locale === "en" ? DATE_FORMAT_PATTERN.en : DATE_FORMAT_PATTERN.default;

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
}): string =>
  format(new Date(timestamp), getFormatPattern(locale).dateTime, {
    locale: getDateFnsLocale(locale),
  });

export const formatDate = ({
  timestamp,
  locale,
}: {
  readonly timestamp: number;
  readonly locale: Locale;
}): string =>
  format(new Date(timestamp), getFormatPattern(locale).date, {
    locale: getDateFnsLocale(locale),
  });
