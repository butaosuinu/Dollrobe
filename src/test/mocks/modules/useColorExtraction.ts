import { vi } from "vitest";
import type { ColorExtractionState } from "@/hooks/useColorExtraction";

const state = {
  extractionState: { status: "idle" } as ColorExtractionState,
  extractColors: vi.fn(),
  reset: vi.fn(),
};

export const useColorExtractionFactory = () => ({
  useColorExtraction: () => ({
    extractionState: state.extractionState,
    extractColors: state.extractColors,
    reset: state.reset,
  }),
});

export const setupUseColorExtraction = () => {
  state.extractColors.mockReset();
  state.reset.mockReset();
  state.extractionState = { status: "idle" };
  return {
    extractColors: state.extractColors,
    reset: state.reset,
    setExtractionState: (s: ColorExtractionState) => {
      state.extractionState = s;
    },
  };
};
