import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import HorizontalBarChart from "./HorizontalBarChart";

describe("HorizontalBarChart", () => {
  it("items が空のときは何も描画しない", async () => {
    await renderWithProviders(<HorizontalBarChart items={[]} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("単一アイテムを描画する (color あり / swatch なし)", async () => {
    await renderWithProviders(
      <HorizontalBarChart
        items={[{ label: "赤", value: 5, color: "hsl(0,100%,50%)" }]}
      />,
    );
    expect(screen.getByText("赤")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("swatch ありのアイテムは色サンプルが描画される", async () => {
    const { container } = await renderWithProviders(
      <HorizontalBarChart
        items={[
          {
            label: "青",
            value: 3,
            swatch: "hsl(240,100%,50%)",
          },
        ]}
      />,
    );
    // swatch span は label 直前に inline 描画される。
    // background-color が item.swatch と一致することを直接確認する。
    const swatches = container.querySelectorAll(
      "span.rounded-full[style*='background-color']",
    );
    expect(swatches.length).toBe(1);
    // happy-dom が style 文字列を正規化してスペースを挿入する点に注意
    expect(swatches[0]?.getAttribute("style")).toContain("hsl(240, 100%, 50%)");
  });

  it("swatch 無しのアイテムは色サンプル span が描画されない", async () => {
    const { container } = await renderWithProviders(
      <HorizontalBarChart items={[{ label: "ラベル", value: 1 }]} />,
    );
    const swatches = container.querySelectorAll(
      "span.rounded-full[style*='background-color']",
    );
    expect(swatches.length).toBe(0);
  });

  it("maxValue=0 (全 value=0) の場合は percentage=0%", async () => {
    await renderWithProviders(
      <HorizontalBarChart
        items={[
          { label: "A", value: 0 },
          { label: "B", value: 0 },
        ]}
      />,
    );
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(2);
    bars.forEach((bar) => {
      expect(bar.style.width).toBe("0%");
    });
  });

  it("複数アイテムで相対割合に基づき幅が計算される", async () => {
    await renderWithProviders(
      <HorizontalBarChart
        items={[
          { label: "A", value: 10 },
          { label: "B", value: 5 },
        ]}
      />,
    );
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0]?.style.width).toBe("100%");
    expect(bars[1]?.style.width).toBe("50%");
  });
});
