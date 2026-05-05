import { vi } from "vitest";

type MockTrack = { readonly stop: ReturnType<typeof vi.fn> };
type MockStream = { readonly getTracks: () => readonly MockTrack[] };

export const createMockTrack = (): MockTrack => ({
  stop: vi.fn(),
});

export const createMockMediaStream = (
  track: MockTrack = createMockTrack(),
): MockStream => ({
  getTracks: () => [track],
});

type InstallMediaDevicesOptions = {
  readonly getUserMedia?: ReturnType<typeof vi.fn>;
  readonly resolveStream?: MockStream;
  readonly rejectError?: Error;
};

export const installMediaDevices = (
  options: InstallMediaDevicesOptions = {},
): {
  readonly getUserMedia: ReturnType<typeof vi.fn>;
  readonly restore: () => void;
} => {
  const getUserMedia = options.getUserMedia ?? vi.fn();

  if (options.resolveStream !== undefined) {
    getUserMedia.mockResolvedValue(options.resolveStream);
  } else if (options.rejectError !== undefined) {
    getUserMedia.mockRejectedValue(options.rejectError);
  }

  const original = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    writable: true,
    configurable: true,
  });

  return {
    getUserMedia,
    restore: () => {
      if (original === undefined) {
        Reflect.deleteProperty(navigator, "mediaDevices");
      } else {
        Object.defineProperty(navigator, "mediaDevices", original);
      }
    },
  };
};
