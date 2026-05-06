import { vi, type MockInstance } from "vitest";
import { installObjectProperty } from "@/test/helpers/propertyMock";

type WriteTextSpy = MockInstance<(text: string) => Promise<void>>;

type InstallOptions = {
  readonly shouldFail?: boolean;
};

const createImpl = (shouldFail: boolean): WriteTextSpy =>
  shouldFail
    ? vi
        .fn<(text: string) => Promise<void>>()
        .mockRejectedValue(new Error("Clipboard write failed"))
    : vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

export const installClipboard = (
  options: InstallOptions = {},
): { readonly writeText: WriteTextSpy } => {
  const writeText = createImpl(options.shouldFail === true);
  installObjectProperty(navigator, "clipboard", { writeText });
  return { writeText };
};

export { restoreInstalledProperties as restoreClipboard } from "@/test/helpers/propertyMock";
