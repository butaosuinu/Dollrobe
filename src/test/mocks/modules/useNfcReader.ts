import type { NfcReaderState } from "@/hooks/useNfcReader";

type Trigger = { readonly onScan: ((data: string) => void) | undefined };

type State = {
  readonly nfcState: NfcReaderState;
  readonly trigger: Trigger;
};

const createInitial = (): State => ({
  nfcState: { status: "idle" },
  trigger: { onScan: undefined },
});

const initialState = createInitial();
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const useNfcReaderFactory = () => ({
  useNfcReader: ({
    onScan,
  }: {
    readonly onScan: (data: string) => void;
    readonly isActive: boolean;
  }) => {
    setState({ ...getState(), trigger: { onScan } });
    return { nfcState: getState().nfcState };
  },
});

export const setupUseNfcReader = (
  initial: NfcReaderState = { status: "idle" },
) => {
  setState({ nfcState: initial, trigger: { onScan: undefined } });
  return {
    setNfcState: (s: NfcReaderState) => {
      setState({ ...getState(), nfcState: s });
    },
    triggerScan: (data: string) => {
      getState().trigger.onScan?.(data);
    },
    get onScan(): ((data: string) => void) | undefined {
      return getState().trigger.onScan;
    },
  };
};
