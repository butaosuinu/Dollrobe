import type { QRCode } from "jsqr";
import { act } from "@testing-library/react";
import { vi } from "vitest";

const state = {
  jsQR: vi.fn<
    (data: Uint8ClampedArray, w: number, h: number) => QRCode | null
  >(),
};

export const jsqrFactory = () => ({
  default: state.jsQR,
});

export const setupJsqr = () => {
  state.jsQR.mockReset();
  return state.jsQR;
};

const SCAN_INTERVAL_MS = 250;

/**
 * QrScanner の setInterval(scanFrame) 1 ティック分を進めて、jsQR が指定 data を
 * 返すようキューに積んでから fake timer を進める。setInterval だけ fake 化
 * された環境（`vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] })`）
 * で QrScanner.onScan を実コンポーネント経由で発火させる用途。
 */
export const simulateQrScan = async (data: string): Promise<void> => {
  state.jsQR.mockReturnValueOnce(createMockQRCode(data));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
  });
};

export const createMockQRCode = (data: string): QRCode => {
  const point = { x: 0, y: 0 };
  return {
    binaryData: [],
    data,
    chunks: [],
    version: 1,
    location: {
      topRightCorner: point,
      topLeftCorner: point,
      bottomRightCorner: point,
      bottomLeftCorner: point,
      topRightFinderPattern: point,
      topLeftFinderPattern: point,
      bottomLeftFinderPattern: point,
    },
  };
};
