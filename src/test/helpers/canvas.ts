import { vi } from "vitest";
import {
  installObjectProperty,
  restoreInstalledProperties,
} from "@/test/helpers/propertyMock";

type Canvas2DContextLike = {
  readonly drawImage: ReturnType<typeof vi.fn>;
  readonly getImageData: ReturnType<typeof vi.fn>;
};

type InstallCanvas2DContextOptions = {
  readonly imageData?: {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
  };
};

export const restoreCanvasMocks = restoreInstalledProperties;

export const installCanvas2DContext = (
  options: InstallCanvas2DContextOptions = {},
): {
  readonly ctx: Canvas2DContextLike;
  readonly getContext: ReturnType<typeof vi.fn>;
} => {
  const imageData = options.imageData ?? {
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  };

  const ctx: Canvas2DContextLike = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => imageData),
  };

  const getContext = vi.fn(() => ctx);
  installObjectProperty(HTMLCanvasElement.prototype, "getContext", getContext);
  return { ctx, getContext };
};

export const installCanvas2DContextNull = (): {
  readonly getContext: ReturnType<typeof vi.fn>;
} => {
  const getContext = vi.fn(() => null);
  installObjectProperty(HTMLCanvasElement.prototype, "getContext", getContext);
  return { getContext };
};

export const installCanvasToBlob = (
  blob: Blob | null,
): { readonly toBlob: ReturnType<typeof vi.fn> } => {
  const toBlob = vi.fn((callback: (b: Blob | null) => void) => {
    callback(blob);
  });
  installObjectProperty(HTMLCanvasElement.prototype, "toBlob", toBlob);
  return { toBlob };
};

export const installCanvasToDataURL = (
  dataUrl: string,
): { readonly toDataURL: ReturnType<typeof vi.fn> } => {
  const toDataURL = vi.fn(() => dataUrl);
  installObjectProperty(HTMLCanvasElement.prototype, "toDataURL", toDataURL);
  return { toDataURL };
};

export const installVideoReadyState = (
  state: number,
  haveEnoughData = 4,
): void => {
  installObjectProperty(HTMLVideoElement.prototype, "readyState", state);
  installObjectProperty(
    HTMLVideoElement.prototype,
    "HAVE_ENOUGH_DATA",
    haveEnoughData,
  );
};
