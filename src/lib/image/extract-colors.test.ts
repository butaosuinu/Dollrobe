import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPngFile } from "@/test/helpers/files";
import type { ExtractColorsResponse } from "./extract-colors-types";

type MessageHandler = (event: { readonly data: ExtractColorsResponse }) => void;

const mockWorkerInstance = vi.hoisted(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  terminate: vi.fn(),
}));

function buildWorkerInstance(): typeof mockWorkerInstance {
  return mockWorkerInstance;
}

vi.stubGlobal("Worker", vi.fn(buildWorkerInstance));

const fireWorkerMessage = (data: ExtractColorsResponse): void => {
  const call = mockWorkerInstance.addEventListener.mock.calls.find(
    (c) => c[0] === "message",
  );
  const handler: MessageHandler | undefined = call?.[1];
  if (handler !== undefined) {
    handler({ data });
  }
};

describe("extractColorsFromFile", () => {
  beforeEach(() => {
    mockWorkerInstance.postMessage.mockReset();
    mockWorkerInstance.addEventListener.mockReset();
    mockWorkerInstance.removeEventListener.mockReset();
  });

  it("Worker にファイルを送信して色を受け取る", async () => {
    mockWorkerInstance.postMessage.mockImplementation(() => {
      fireWorkerMessage({
        type: "result",
        presetColors: ["hsl(0, 70%, 55%)"],
      });
    });

    const { extractColorsFromFile } = await import("./extract-colors");
    const result = await extractColorsFromFile({
      file: createPngFile(),
    });

    expect(result.presetColors).toEqual(["hsl(0, 70%, 55%)"]);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: "extract",
      file: expect.any(File),
    });
  });

  it("Worker からエラーが返った場合はエラーをスローする", async () => {
    mockWorkerInstance.postMessage.mockImplementation(() => {
      fireWorkerMessage({
        type: "error",
        message: "OpenCV.js failed to load",
      });
    });

    const { extractColorsFromFile } = await import("./extract-colors");

    await expect(
      extractColorsFromFile({
        file: createPngFile(),
      }),
    ).rejects.toThrow("OpenCV.js failed to load");
  });
});
