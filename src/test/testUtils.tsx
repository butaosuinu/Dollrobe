import { render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactElement } from "react";

export const renderWithProviders = (ui: ReactElement) => {
  const store = createStore();
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  };
};
