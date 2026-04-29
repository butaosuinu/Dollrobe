"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@/i18n/lingui";
import { localeReadyAtom } from "@/i18n/localeAtom";

type Props = {
  readonly children: React.ReactNode;
};

const LocaleGate = ({ children }: Props) => {
  useAtomValue(localeReadyAtom);
  return <>{children}</>;
};

const LinguiClientProvider = ({ children }: Props) => (
  <I18nProvider i18n={i18n}>
    <Suspense fallback={null}>
      <LocaleGate>{children}</LocaleGate>
    </Suspense>
  </I18nProvider>
);

export default LinguiClientProvider;
