"use client";

import { useEffect } from "react";
import { I18nProvider } from "@lingui/react";
import { useSetAtom } from "jotai";
import { i18n } from "@/i18n/lingui";
import { initLocaleAtom } from "@/i18n/localeAtom";

type Props = {
  readonly children: React.ReactNode;
};

const LinguiClientProvider = ({ children }: Props) => {
  const initLocale = useSetAtom(initLocaleAtom);

  useEffect(() => {
    initLocale().catch(() => undefined);
  }, [initLocale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};

export default LinguiClientProvider;
