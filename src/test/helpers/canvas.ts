import { vi } from "vitest";

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

const restoreHandles = new Set<() => void>();

const installPrototypeProperty = (
  proto: object,
  key: string,
  value: unknown,
): void => {
  const original = Object.getOwnPropertyDescriptor(proto, key);
  Object.defineProperty(proto, key, {
    value,
    writable: true,
    configurable: true,
  });
  restoreHandles.add(() => {
    if (original === undefined) {
      Reflect.deleteProperty(proto, key);
      return;
    }
    Object.defineProperty(proto, key, original);
  });
};

export const restoreCanvasMocks = (): void => {
  restoreHandles.forEach((restore) => {
    restore();
  });
  restoreHandles.clear();
};

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
  installPrototypeProperty(
    HTMLCanvasElement.prototype,
    "getContext",
    getContext,
  );
  return { ctx, getContext };
};

export const installCanvas2DContextNull = (): {
  readonly getContext: ReturnType<typeof vi.fn>;
} => {
  const getContext = vi.fn(() => null);
  installPrototypeProperty(
    HTMLCanvasElement.prototype,
    "getContext",
    getContext,
  );
  return { getContext };
};

export const installCanvasToBlob = (
  blob: Blob | null,
): { readonly toBlob: ReturnType<typeof vi.fn> } => {
  const toBlob = vi.fn((callback: (b: Blob | null) => void) => {
    callback(blob);
  });
  installPrototypeProperty(HTMLCanvasElement.prototype, "toBlob", toBlob);
  return { toBlob };
};

export const installCanvasToDataURL = (
  dataUrl: string,
): { readonly toDataURL: ReturnType<typeof vi.fn> } => {
  const toDataURL = vi.fn(() => dataUrl);
  installPrototypeProperty(HTMLCanvasElement.prototype, "toDataURL", toDataURL);
  return { toDataURL };
};

export const installVideoReadyState = (
  state: number,
  haveEnoughData = 4,
): void => {
  installPrototypeProperty(HTMLVideoElement.prototype, "readyState", state);
  installPrototypeProperty(
    HTMLVideoElement.prototype,
    "HAVE_ENOUGH_DATA",
    haveEnoughData,
  );
};
