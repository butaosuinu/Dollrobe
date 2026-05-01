const state = {
  suggestions: [] as readonly string[],
};

export const useBrandSuggestionsFactory = () => ({
  useBrandSuggestions: () => state.suggestions,
});

export const setupUseBrandSuggestions = (
  suggestions: readonly string[] = [],
) => {
  state.suggestions = suggestions;
  return {
    setSuggestions: (s: readonly string[]) => {
      state.suggestions = s;
    },
  };
};
