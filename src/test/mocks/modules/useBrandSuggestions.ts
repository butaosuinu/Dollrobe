type State = { readonly suggestions: readonly string[] };

const initialState: State = { suggestions: [] };
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const useBrandSuggestionsFactory = () => ({
  useBrandSuggestions: () => getState().suggestions,
});

export const setupUseBrandSuggestions = (
  suggestions: readonly string[] = [],
) => {
  setState({ suggestions });
  return {
    setSuggestions: (s: readonly string[]) => {
      setState({ suggestions: s });
    },
  };
};
