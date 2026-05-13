import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import HorizontalBarChart from "./HorizontalBarChart";

describe("HorizontalBarChart", () => {
  it("items が空のときは何も描画しない", async () => {
    const { container } = await renderWithProviders(
      <HorizontalBarChart items={[]} />,
    );
    expect(container.querySelector("[role=progressbar]")).toBeNull();
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
    const swatch = container.querySelector("span[style*='background-color']");
    expect(swatch).not.toBeNull();
  });

  it("maxValue=0 (全 value=0) の場合は percentage=0%", async () => {
    const { container } = await renderWithProviders(
      <HorizontalBarChart
        items={[
          { label: "A", value: 0 },
          { label: "B", value: 0 },
        ]}
      />,
    );
    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars.length).toBe(2);
    bars.forEach((bar) => {
      expect((bar as HTMLElement).style.width).toBe("0%");
    });
  });

  it("複数アイテムで相対割合に基づき幅が計算される", async () => {
    const { container } = await renderWithProviders(
      <HorizontalBarChart
        items={[
          { label: "A", value: 10 },
          { label: "B", value: 5 },
        ]}
      />,
    );
    const bars = container.querySelectorAll('[role="progressbar"]');
    expect((bars[0] as HTMLElement).style.width).toBe("100%");
    expect((bars[1] as HTMLElement).style.width).toBe("50%");
  });
});
