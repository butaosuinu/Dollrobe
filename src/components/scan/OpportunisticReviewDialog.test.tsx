import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { createTestGarment, FIXED_NOW } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import { MS_PER_DAY } from "@/lib/constants";
import type { Garment } from "@/types";
import OpportunisticReviewDialog from "./OpportunisticReviewDialog";

const TWENTY_DAYS_AGO = FIXED_NOW - 20 * MS_PER_DAY;

const staleGarments: readonly Garment[] = [
  createTestGarment({
    id: "g-1",
    name: "古いドレス",
    locationId: "loc-1",
    status: "stored",
    lastScannedAt: TWENTY_DAYS_AGO,
    confidenceDecayDays: 30,
    confidenceDecayDaysOverride: 30,
  }),
  createTestGarment({
    id: "g-2",
    name: "古いコート",
    locationId: "loc-1",
    status: "stored",
    lastScannedAt: TWENTY_DAYS_AGO,
    confidenceDecayDays: 30,
    confidenceDecayDaysOverride: 30,
  }),
];

describe("OpportunisticReviewDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmAll = vi.fn();
  const mockOnConfirmPartial = vi.fn();

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    mockOnClose.mockClear();
    mockOnConfirmAll.mockClear();
    mockOnConfirmPartial.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isOpen=falseの場合は何も表示されない", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen={false}
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    expect(screen.queryByText("古いドレス")).toBeNull();
    expect(screen.queryByText("全部ある")).toBeNull();
  });

  it("レビュー対象のアイテム名と信頼度バーが表示される", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    expect(screen.getByText("古いドレス")).toBeInTheDocument();
    expect(screen.getByText("古いコート")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("「全部ある」ボタンでonConfirmAllが呼ばれる", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "全部ある" }));

    expect(mockOnConfirmAll).toHaveBeenCalledOnce();
  });

  it("「ズレを直す」で個別選択モードに切り替わる", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));

    expect(screen.getAllByRole("button", { name: "ある" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "ない" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "確定する" }),
    ).toBeInTheDocument();
  });

  it("個別選択モードでトグル切替が動作する", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));

    const naiButtons = screen.getAllByRole("button", { name: "ない" });
    const firstNaiButton = naiButtons[0];
    expect(firstNaiButton).toBeDefined();
    if (firstNaiButton === undefined) return;
    fireEvent.click(firstNaiButton);

    expect(firstNaiButton).toHaveClass("bg-red-500");
  });

  it("個別選択モードで「確定する」が正しいconfirmationsを渡す", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));

    const naiButtons = screen.getAllByRole("button", { name: "ない" });
    const secondNaiButton = naiButtons[1];
    expect(secondNaiButton).toBeDefined();
    if (secondNaiButton === undefined) return;
    fireEvent.click(secondNaiButton);

    fireEvent.click(screen.getByRole("button", { name: "確定する" }));

    expect(mockOnConfirmPartial).toHaveBeenCalledWith([
      { garmentId: "g-1", confirmed: true },
      { garmentId: "g-2", confirmed: false },
    ]);
  });

  it("「戻る」ボタンで概要モードに戻る", async () => {
    await renderWithProviders(
      <OpportunisticReviewDialog
        isOpen
        onClose={mockOnClose}
        itemsNeedingReview={staleGarments}
        onConfirmAll={mockOnConfirmAll}
        onConfirmPartial={mockOnConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ズレを直す" }));
    expect(
      screen.getByRole("button", { name: "確定する" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.queryByRole("button", { name: "確定する" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "全部ある" }),
    ).toBeInTheDocument();
  });
});
