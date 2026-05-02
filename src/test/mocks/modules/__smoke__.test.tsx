import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { createId } from "@paralleldrive/cuid2";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useNfcSupported } from "@/hooks/useNfcSupported";
import { useNfcReader } from "@/hooks/useNfcReader";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { useBrandSuggestions } from "@/hooks/useBrandSuggestions";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import jsQR from "jsqr";
import { setupNextNavigation } from "./nextNavigation";
import { setupCuid2 } from "./cuid2";
import { setupUseImageUpload } from "./useImageUpload";
import { setupUseNfcSupported } from "./useNfcSupported";
import { setupUseNfcReader } from "./useNfcReader";
import { setupUseColorExtraction } from "./useColorExtraction";
import { setupUseBrandSuggestions } from "./useBrandSuggestions";
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

  it("cuid2 setupCuid2 で createId が固定値を返す", () => {
    setupCuid2({ id: "fixed-id" });
    expect(createId()).toBe("fixed-id");

    setupCuid2({ mode: "sequential", id: "seq" });
    expect(createId()).toBe("seq-1");
    expect(createId()).toBe("seq-2");
  });

  it("useImageUpload setup で state と spy が制御できる", () => {
    const handle = setupUseImageUpload();
    handle.setUploadState({
      status: "success",
      imageUrl: "https://example.com/x.png",
    });

    const result = useImageUpload();
    expect(result.uploadState).toEqual({
      status: "success",
      imageUrl: "https://example.com/x.png",
    });

    void result.upload({ file: new File([""], "x.png"), garmentId: "g-1" });
    expect(handle.upload).toHaveBeenCalled();
  });

  it("useNfcSupported setup で boolean が切り替わる", () => {
    setupUseNfcSupported(true);
    expect(useNfcSupported()).toBe(true);

    setupUseNfcSupported(false);
    expect(useNfcSupported()).toBe(false);
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

  it("useBrandSuggestions setup で配列が切り替わる", () => {
    setupUseBrandSuggestions(["A社", "B社"]);
    expect(useBrandSuggestions()).toEqual(["A社", "B社"]);
  });

  it("useOnlineSync は呼び出してもエラーにならない", () => {
    expect(() => {
      useOnlineSync();
    }).not.toThrow();
  });

  it("jsqr setupJsqr で mock を制御できる", () => {
    const mock = setupJsqr();
    const fakeQr = createMockQRCode("dwg://g/abc");
    mock.mockReturnValue(fakeQr);

    const result = jsQR(new Uint8ClampedArray(4), 1, 1);
    expect(result?.data).toBe("dwg://g/abc");
  });
});
