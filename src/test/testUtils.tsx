import { act, render, type RenderResult } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { Suspense, type ReactElement } from "react";
import { I18nTestWrapper } from "@/test/i18nWrapper";

type RenderWithProvidersResult = RenderResult & {
  readonly store: ReturnType<typeof createStore>;
};

export const renderWithProviders = async (
  ui: ReactElement,
): Promise<RenderWithProvidersResult> => {
  const store = createStore();
  const wrapper = (
    <I18nTestWrapper>
      <Provider store={store}>
        <Suspense fallback={<div data-testid="suspense-loading" />}>
          {ui}
        </Suspense>
      </Provider>
    </I18nTestWrapper>
  );
  const result: RenderResult = await act(() => render(wrapper));
  return { ...result, store };
};
