import { vi } from "vitest";
import type { UploadState } from "@/hooks/useImageUpload";

type Spies = {
  readonly upload: ReturnType<typeof vi.fn>;
  readonly reset: ReturnType<typeof vi.fn>;
};

type State = {
  readonly uploadState: UploadState;
  readonly spies: Spies;
};

const createInitial = (): State => ({
  uploadState: { status: "idle" },
  spies: { upload: vi.fn(), reset: vi.fn() },
});

const initialState = createInitial();
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const useImageUploadFactory = () => ({
  useImageUpload: () => {
    const s = getState();
    return {
      uploadState: s.uploadState,
      upload: s.spies.upload,
      reset: s.spies.reset,
    };
  },
});

export const setupUseImageUpload = () => {
  const current = getState();
  current.spies.upload.mockReset();
  current.spies.reset.mockReset();
  setState({ ...current, uploadState: { status: "idle" } });
  return {
    upload: current.spies.upload,
    reset: current.spies.reset,
    setUploadState: (s: UploadState) => {
      setState({ ...getState(), uploadState: s });
    },
  };
};
