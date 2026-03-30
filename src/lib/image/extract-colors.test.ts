import { describe, it, expect, vi } from "vitest";
import type { OpenCV } from "./opencv-loader";

const mockLoadOpencv = vi.hoisted(() =>
  vi.fn<() => Promise<OpenCV | undefined>>(),
);

vi.mock("./opencv-loader", () => ({
  loadOpencv: mockLoadOpencv,
}));

describe("extractColorsFromFile", () => {
  it("OpenCV ロード失敗時はエラーをスローする", async () => {
    mockLoadOpencv.mockResolvedValueOnce(undefined);

    const { extractColorsFromFile } = await import("./extract-colors");

    await expect(
      extractColorsFromFile({
        file: new File(["dummy"], "test.png", { type: "image/png" }),
      }),
    ).rejects.toThrow("OpenCV.js failed to load");
  });
});
