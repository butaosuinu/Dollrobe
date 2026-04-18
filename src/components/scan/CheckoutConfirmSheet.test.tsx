import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import CheckoutConfirmSheet from "./CheckoutConfirmSheet";

describe("CheckoutConfirmSheet", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmAll = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirmAll.mockClear();
  });

  it("isOpen=false の場合は何も表示されない", async () => {
    await renderWithProviders(
      <CheckoutConfirmSheet
        isOpen={false}
        onClose={mockOnClose}
        uncertainItemCount={3}
        onConfirmAll={mockOnConfirmAll}
      />,
    );

    expect(screen.queryByRole("button", { name: "全部ある" })).toBeNull();
    expect(screen.queryByRole("button", { name: "スキップ" })).toBeNull();
  });

  it("isOpen=true でタイトルと未確認件数、ボタンが表示される", async () => {
    await renderWithProviders(
      <CheckoutConfirmSheet
        isOpen
        onClose={mockOnClose}
        uncertainItemCount={3}
        onConfirmAll={mockOnConfirmAll}
      />,
    );

    expect(
      screen.getByText("この引き出しの他の服、まだありますか？"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3 件が最後のスキャンから時間が経っています/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "全部ある" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "スキップ" }),
    ).toBeInTheDocument();
  });

  it("「全部ある」ボタンで onConfirmAll と onClose が呼ばれる", async () => {
    await renderWithProviders(
      <CheckoutConfirmSheet
        isOpen
        onClose={mockOnClose}
        uncertainItemCount={2}
        onConfirmAll={mockOnConfirmAll}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "全部ある" }));

    expect(mockOnConfirmAll).toHaveBeenCalledOnce();
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("「スキップ」ボタンで onClose のみが呼ばれる", async () => {
    await renderWithProviders(
      <CheckoutConfirmSheet
        isOpen
        onClose={mockOnClose}
        uncertainItemCount={2}
        onConfirmAll={mockOnConfirmAll}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));

    expect(mockOnClose).toHaveBeenCalledOnce();
    expect(mockOnConfirmAll).not.toHaveBeenCalled();
  });
});
