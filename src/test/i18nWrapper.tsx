import type { ReactNode } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";

i18n.load("ja", {});
i18n.activate("ja");

export const I18nTestWrapper = ({
  children,
}: {
  readonly children: ReactNode;
}) => <I18nProvider i18n={i18n}>{children}</I18nProvider>;
