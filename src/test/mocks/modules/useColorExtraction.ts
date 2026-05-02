import { vi } from "vitest";
import type { ColorExtractionState } from "@/hooks/useColorExtraction";

type Spies = {
  readonly extractColors: ReturnType<typeof vi.fn>;
  readonly reset: ReturnType<typeof vi.fn>;
};

type State = {
  readonly extractionState: ColorExtractionState;
  readonly spies: Spies;
};

const createInitial = (): State => ({
  extractionState: { status: "idle" },
  spies: { extractColors: vi.fn(), reset: vi.fn() },
});

const initialState = createInitial();
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const useColorExtractionFactory = () => ({
  useColorExtraction: () => {
    const s = getState();
    return {
      extractionState: s.extractionState,
      extractColors: s.spies.extractColors,
      reset: s.spies.reset,
    };
  },
});

export const setupUseColorExtraction = () => {
  const current = getState();
  current.spies.extractColors.mockReset();
  current.spies.reset.mockReset();
  setState({ ...current, extractionState: { status: "idle" } });
  return {
    extractColors: current.spies.extractColors,
    reset: current.spies.reset,
    setExtractionState: (s: ColorExtractionState) => {
      setState({ ...getState(), extractionState: s });
    },
  };
};
