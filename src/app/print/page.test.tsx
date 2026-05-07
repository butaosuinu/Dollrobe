import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import PrintPage from "./page";

describe("PrintPage", () => {
  beforeEach(() => {
    setupNextNavigation();
  });

  it("パラメータなしで「選択されていません」メッセージが表示される", async () => {
    await renderWithProviders(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });

  it("type と ids が指定されたら QR ラベルが表示される", async () => {
    setupNextNavigation({
      searchParams: new URLSearchParams(
        "type=garment&ids=g1&ids=g2&names=ドレスA&names=ドレスB",
      ),
    });
    await renderWithProviders(<PrintPage />);
    expect(screen.getByText("QR ラベル印刷")).toBeInTheDocument();
    expect(screen.getByText("ドレスA")).toBeInTheDocument();
    expect(screen.getByText("ドレスB")).toBeInTheDocument();
  });

  it("印刷ボタンが存在する", async () => {
    setupNextNavigation({
      searchParams: new URLSearchParams("type=garment&ids=g1&names=テスト"),
    });
    await renderWithProviders(<PrintPage />);
    expect(screen.getByRole("button", { name: /印刷/ })).toBeInTheDocument();
  });

  it("names が指定されていない場合は id がラベルに使われる", async () => {
    setupNextNavigation({
      searchParams: new URLSearchParams("type=location&ids=loc-1"),
    });
    await renderWithProviders(<PrintPage />);
    expect(screen.getByText("loc-1")).toBeInTheDocument();
  });

  it("無効な type の場合は「選択されていません」が表示される", async () => {
    setupNextNavigation({
      searchParams: new URLSearchParams("type=invalid&ids=g1"),
    });
    await renderWithProviders(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });
});
