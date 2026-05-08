import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { useNfcReader } from "@/hooks/useNfcReader";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import jsQR from "jsqr";
import { setupNextNavigation } from "./nextNavigation";
import { setupUseNfcReader } from "./useNfcReader";
import { setupUseColorExtraction } from "./useColorExtraction";
import { setupJsqr, createMockQRCode } from "./jsqr";

describe("modules wrapper smoke test", () => {
  it("nextNavigation 経由で useRouter / useSearchParams / useParams が差し替わる", () => {
    const handle = setupNextNavigation({
      searchParams: new URLSearchParams("foo=bar"),
      params: { id: "garment-1" },
    });

    const router = useRouter();
    router.push("/test");
    expect(handle.router.push).toHaveBeenCalledWith("/test");

    expect(useSearchParams().get("foo")).toBe("bar");
    expect(useParams()).toEqual({ id: "garment-1" });
  });

  it("nextLink 経由で Link が a タグでレンダリングされる", () => {
    render(<Link href="/foo">link-text</Link>);
    expect(screen.getByText("link-text").tagName).toBe("A");
    expect(screen.getByText("link-text").getAttribute("href")).toBe("/foo");
  });

  it("useNfcReader setup で onScan を外部から呼べる", () => {
    const handle = setupUseNfcReader({ status: "scanning" });
    const onScan = vi.fn();
    const result = useNfcReader({ onScan, isActive: true });

    expect(result.nfcState).toEqual({ status: "scanning" });
    handle.triggerScan("dwg://g/abc");
    expect(onScan).toHaveBeenCalledWith("dwg://g/abc");
  });

  it("useColorExtraction setup で extractionState と spy が制御できる", () => {
    const handle = setupUseColorExtraction();
    handle.setExtractionState({ status: "done", colors: ["hsl(0,100%,50%)"] });

    const result = useColorExtraction();
    expect(result.extractionState).toEqual({
      status: "done",
      colors: ["hsl(0,100%,50%)"],
    });
    void result.extractColors({ file: new File([""], "x.png") });
    expect(handle.extractColors).toHaveBeenCalled();
  });

  it("jsqr setupJsqr で mock を制御できる", () => {
    const mock = setupJsqr();
    const fakeQr = createMockQRCode("dwg://g/abc");
    mock.mockReturnValue(fakeQr);

    const result = jsQR(new Uint8ClampedArray(4), 1, 1);
    expect(result?.data).toBe("dwg://g/abc");
  });
});
