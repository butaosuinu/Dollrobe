import { render, type RenderResult } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";

type RenderWithProvidersResult = RenderResult & {
  readonly store: ReturnType<typeof createStore>;
};

export const renderWithProviders = (
  ui: ReactElement,
): RenderWithProvidersResult => {
  const store = createStore();
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  };
};
