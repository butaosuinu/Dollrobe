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

const restoreOrDelete = (
  key: string,
  original: PropertyDescriptor | undefined,
): void => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLCanvasElement.prototype, key);
    return;
  }
  Object.defineProperty(HTMLCanvasElement.prototype, key, original);
};

export const installCanvas2DContext = (
  options: InstallCanvas2DContextOptions = {},
): {
  readonly ctx: Canvas2DContextLike;
  readonly getContext: ReturnType<typeof vi.fn>;
  readonly restore: () => void;
} => {
  const originalGetContext = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    "getContext",
  );

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
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: getContext,
    writable: true,
    configurable: true,
  });

  return {
    ctx,
    getContext,
    restore: () => {
      restoreOrDelete("getContext", originalGetContext);
    },
  };
};

export const installCanvas2DContextNull = (): {
  readonly getContext: ReturnType<typeof vi.fn>;
  readonly restore: () => void;
} => {
  const originalGetContext = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    "getContext",
  );
  const getContext = vi.fn(() => null);
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: getContext,
    writable: true,
    configurable: true,
  });
  return {
    getContext,
    restore: () => {
      restoreOrDelete("getContext", originalGetContext);
    },
  };
};

export const installCanvasToBlob = (
  blob: Blob | null,
): {
  readonly toBlob: ReturnType<typeof vi.fn>;
  readonly restore: () => void;
} => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    "toBlob",
  );
  const toBlob = vi.fn((callback: (b: Blob | null) => void) => {
    callback(blob);
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    value: toBlob,
    writable: true,
    configurable: true,
  });
  return {
    toBlob,
    restore: () => {
      restoreOrDelete("toBlob", original);
    },
  };
};

export const installCanvasToDataURL = (
  dataUrl: string,
): {
  readonly toDataURL: ReturnType<typeof vi.fn>;
  readonly restore: () => void;
} => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    "toDataURL",
  );
  const toDataURL = vi.fn(() => dataUrl);
  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    value: toDataURL,
    writable: true,
    configurable: true,
  });
  return {
    toDataURL,
    restore: () => {
      restoreOrDelete("toDataURL", original);
    },
  };
};

export const installVideoReadyState = (
  state: number,
  haveEnoughData = 4,
): { readonly restore: () => void } => {
  const originalReadyState = Object.getOwnPropertyDescriptor(
    HTMLVideoElement.prototype,
    "readyState",
  );
  const originalHaveEnoughData = Object.getOwnPropertyDescriptor(
    HTMLVideoElement.prototype,
    "HAVE_ENOUGH_DATA",
  );

  Object.defineProperty(HTMLVideoElement.prototype, "readyState", {
    value: state,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "HAVE_ENOUGH_DATA", {
    value: haveEnoughData,
    writable: true,
    configurable: true,
  });

  return {
    restore: () => {
      if (originalReadyState === undefined) {
        Reflect.deleteProperty(HTMLVideoElement.prototype, "readyState");
      } else {
        Object.defineProperty(
          HTMLVideoElement.prototype,
          "readyState",
          originalReadyState,
        );
      }
      if (originalHaveEnoughData === undefined) {
        Reflect.deleteProperty(HTMLVideoElement.prototype, "HAVE_ENOUGH_DATA");
      } else {
        Object.defineProperty(
          HTMLVideoElement.prototype,
          "HAVE_ENOUGH_DATA",
          originalHaveEnoughData,
        );
      }
    },
  };
};
