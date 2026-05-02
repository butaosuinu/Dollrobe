type State = { readonly supported: boolean };

const initialState: State = { supported: false };
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const useNfcSupportedFactory = () => ({
  useNfcSupported: () => getState().supported,
});

export const setupUseNfcSupported = (supported = false) => {
  setState({ supported });
  return {
    setSupported: (s: boolean) => {
      setState({ supported: s });
    },
  };
};
