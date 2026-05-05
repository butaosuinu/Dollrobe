import type { QRCode } from "jsqr";
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
