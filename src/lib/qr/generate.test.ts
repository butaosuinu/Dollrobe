import { describe, it, expect } from "vitest";
import { generateQrSvgString } from "./generate";

describe("generateQrSvgString", () => {
  it("garment用QRが有効なSVG文字列を返す", async () => {
    const result = await generateQrSvgString({
      type: "garment",
      id: "test-123",
    });
    expect(result).toContain("<svg");
    expect(result).toContain("</svg>");
  });

  it("location用QRが有効なSVG文字列を返す", async () => {
    const result = await generateQrSvgString({
      type: "location",
      id: "loc-456",
    });
    expect(result).toContain("<svg");
    expect(result).toContain("</svg>");
  });

  it("garmentとlocationで異なるQRコードを生成する", async () => {
    const garmentSvg = await generateQrSvgString({
      type: "garment",
      id: "same-id",
    });
    const locationSvg = await generateQrSvgString({
      type: "location",
      id: "same-id",
    });
    expect(garmentSvg).not.toBe(locationSvg);
  });
});
