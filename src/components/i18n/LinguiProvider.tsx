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
    // i18n カタログのロードはアプリ全体の起動を遅延させたくないため、Suspense
    // で待機させずに fire-and-forget で実行する。失敗時はデフォルトロケール
    // （カタログ未ロード = msgid そのまま表示）にフォールバックさせる。
    // データフェッチではなくクライアント側 i18n 初期化のため、本ルールの対象外。
    // eslint-disable-next-line no-restricted-syntax -- i18n init fire-and-forget; not data fetching
    initLocale().catch(() => undefined);
  }, [initLocale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};

export default LinguiClientProvider;
