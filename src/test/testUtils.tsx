import { render, type RenderResult } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";
import { I18nTestWrapper } from "@/test/i18nWrapper";

type RenderWithProvidersResult = RenderResult & {
  readonly store: ReturnType<typeof createStore>;
};

export const renderWithProviders = (
  ui: ReactElement,
): RenderWithProvidersResult => {
  const store = createStore();
  return {
    ...render(
      <I18nTestWrapper>
        <Provider store={store}>{ui}</Provider>
      </I18nTestWrapper>,
    ),
    store,
  };
};
