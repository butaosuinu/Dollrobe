const state = {
  supported: false,
};

export const useNfcSupportedFactory = () => ({
  useNfcSupported: () => state.supported,
});

export const setupUseNfcSupported = (supported = false) => {
  state.supported = supported;
  return {
    setSupported: (s: boolean) => {
      state.supported = s;
    },
  };
};
