import type { NfcReaderState } from "@/hooks/useNfcReader";

const state = {
  nfcState: { status: "idle" } as NfcReaderState,
  trigger: { onScan: undefined as ((data: string) => void) | undefined },
};

export const useNfcReaderFactory = () => ({
  useNfcReader: ({
    onScan,
  }: {
    readonly onScan: (data: string) => void;
    readonly isActive: boolean;
  }) => {
    state.trigger.onScan = onScan;
    return { nfcState: state.nfcState };
  },
});

export const setupUseNfcReader = (
  initialState: NfcReaderState = { status: "idle" },
) => {
  state.nfcState = initialState;
  state.trigger.onScan = undefined;
  return {
    setNfcState: (s: NfcReaderState) => {
      state.nfcState = s;
    },
    triggerScan: (data: string) => {
      state.trigger.onScan?.(data);
    },
    get onScan(): ((data: string) => void) | undefined {
      return state.trigger.onScan;
    },
  };
};
