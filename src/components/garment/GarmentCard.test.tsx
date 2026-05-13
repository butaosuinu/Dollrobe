import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { Garment } from "@/types";
import { renderWithProviders } from "@/test/testUtils";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
import { setupAuthSession } from "@/test/mocks/modules/authAtomsState";
import GarmentCard from "./GarmentCard";

const make = (overrides: Partial<Garment> = {}): Garment =>
  createTestGarment({
    name: "テスト服",
    category: "dress",
    dollSizes: ["MSD"],
    ...overrides,
  });

describe("GarmentCard", () => {
  beforeEach(() => {
    setupAuthSession({ userId: "user-1" });
  });

  it("画像 URL 無しでも fallback アイコン付きで描画される", async () => {
    await renderWithProviders(<GarmentCard garment={make()} />);
    expect(await screen.findByText("テスト服")).toBeInTheDocument();
    expect(screen.queryByAltText("テスト服")).toBeNull();
  });

  it("画像 URL 設定済みなら img タグが描画される", async () => {
    await renderWithProviders(
      <GarmentCard garment={make({ imageUrl: "https://example.com/x.png" })} />,
    );
    expect(await screen.findByAltText("テスト服")).toHaveAttribute(
      "src",
      "https://example.com/x.png",
    );
  });

  it("checked_out 状態の服は「取り出し中」バッジが表示される", async () => {
    await renderWithProviders(
      <GarmentCard
        garment={make({
          status: "checked_out",
          locationId: undefined,
          checkedOutAt: FIXED_NOW,
        })}
      />,
    );
    expect(await screen.findByText("取り出し中")).toBeInTheDocument();
  });

  it("ブランドありの服はブランド名が表示される", async () => {
    await renderWithProviders(
      <GarmentCard garment={make({ brand: "アゾン" })} />,
    );
    expect(await screen.findByText("アゾン")).toBeInTheDocument();
  });

  it("ブランド未設定の服はブランド表示行が無い", async () => {
    await renderWithProviders(
      <GarmentCard garment={make({ brand: undefined })} />,
    );
    expect(await screen.findByText("テスト服")).toBeInTheDocument();
    expect(screen.queryByText("アゾン")).toBeNull();
  });
});
