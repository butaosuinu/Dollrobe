import { vi } from "vitest";
import { installObjectProperty } from "@/test/helpers/propertyMock";

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

type InstallMediaElementPlaybackOptions = {
  readonly videoWidth?: number;
  readonly videoHeight?: number;
};

/**
 * happy-dom が `srcObject` の型チェックを行うため、media element の play() /
 * srcObject / videoWidth / videoHeight を `installObjectProperty` 経由で上書き
 * して useCamera / QrScanner の実コンポーネントをテスト環境で動かす。
 * `restoreInstalledProperties` で setup.ts の afterEach に自動復元される。
 */
export const installMediaElementPlayback = (
  options: InstallMediaElementPlaybackOptions = {},
): { readonly play: ReturnType<typeof vi.fn> } => {
  const play = vi.fn(async (): Promise<undefined> => {
    await Promise.resolve();
    return undefined;
  });
  installObjectProperty(HTMLMediaElement.prototype, "play", play);
  installObjectProperty(HTMLMediaElement.prototype, "srcObject", undefined);
  if (options.videoWidth !== undefined) {
    installObjectProperty(
      HTMLVideoElement.prototype,
      "videoWidth",
      options.videoWidth,
    );
  }
  if (options.videoHeight !== undefined) {
    installObjectProperty(
      HTMLVideoElement.prototype,
      "videoHeight",
      options.videoHeight,
    );
  }
  return { play };
};

/**
 * `navigator.mediaDevices` 自体が存在しない環境（非セキュアコンテキスト等）を
 * 再現する。`restoreInstalledProperties` で setup.ts の afterEach に自動復元される。
 */
export const installMediaDevicesUnavailable = (): void => {
  installObjectProperty(navigator, "mediaDevices", undefined);
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
