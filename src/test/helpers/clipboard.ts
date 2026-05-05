import { vi, type MockInstance } from "vitest";

type WriteTextSpy = MockInstance<(text: string) => Promise<void>>;

type ClipboardSpyState = {
  readonly writeText: WriteTextSpy;
};

type RestoreState = {
  readonly mode: "spy" | "define" | "none";
  readonly target: object | undefined;
  readonly originalDescriptor: PropertyDescriptor | undefined;
  readonly spy: WriteTextSpy | undefined;
};

const initialRestore: RestoreState = {
  mode: "none",
  target: undefined,
  originalDescriptor: undefined,
  spy: undefined,
};

const spyMap = new Map<"v", ClipboardSpyState>();
const restoreMap = new Map<"v", RestoreState>([["v", initialRestore]]);

const getRestore = (): RestoreState => restoreMap.get("v") ?? initialRestore;
const setRestore = (next: RestoreState): void => {
  restoreMap.set("v", next);
};

type InstallOptions = {
  readonly shouldFail?: boolean;
};

const createImpl = (shouldFail: boolean) =>
  shouldFail
    ? vi
        .fn<(text: string) => Promise<void>>()
        .mockRejectedValue(new Error("Clipboard write failed"))
    : vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

export const installClipboard = (
  options: InstallOptions = {},
): ClipboardSpyState => {
  const shouldFail = options.shouldFail === true;
  const writeText = createImpl(shouldFail);

  if (
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    const spy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockImplementation(writeText);
    spyMap.set("v", { writeText: spy });
    setRestore({
      mode: "spy",
      target: undefined,
      originalDescriptor: undefined,
      spy,
    });
    return { writeText: spy };
  }

  const originalDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard",
  );
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  spyMap.set("v", { writeText });
  setRestore({
    mode: "define",
    target: navigator,
    originalDescriptor,
    spy: undefined,
  });
  return { writeText };
};

export const restoreClipboard = (): void => {
  const restore = getRestore();
  if (restore.mode === "spy" && restore.spy !== undefined) {
    restore.spy.mockRestore();
  } else if (restore.mode === "define" && restore.target !== undefined) {
    if (restore.originalDescriptor === undefined) {
      Reflect.deleteProperty(restore.target, "clipboard");
    } else {
      Object.defineProperty(
        restore.target,
        "clipboard",
        restore.originalDescriptor,
      );
    }
  }
  spyMap.delete("v");
  setRestore(initialRestore);
};
