import { vi } from "vitest";
import type { UploadState } from "@/hooks/useImageUpload";

const state = {
  uploadState: { status: "idle" } as UploadState,
  upload: vi.fn(),
  reset: vi.fn(),
};

export const useImageUploadFactory = () => ({
  useImageUpload: () => ({
    uploadState: state.uploadState,
    upload: state.upload,
    reset: state.reset,
  }),
});

export const setupUseImageUpload = () => {
  state.upload.mockReset();
  state.reset.mockReset();
  state.uploadState = { status: "idle" };
  return {
    upload: state.upload,
    reset: state.reset,
    setUploadState: (s: UploadState) => {
      state.uploadState = s;
    },
  };
};
