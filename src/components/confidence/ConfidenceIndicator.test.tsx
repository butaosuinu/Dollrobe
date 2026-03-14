import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider, createStore } from "jotai";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import ConfidenceIndicator from "./ConfidenceIndicator";
import type { Garment } from "@/types";
import { MS_PER_DAY } from "@/lib/constants";

const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

const createTestGarment = (overrides: Partial<Garment> = {}): Garment => ({
  id: "test-id",
  userId: "test-user",
  name: "テスト服",
  category: "tops",
  dollSize: "1/3",
  colors: [],
  tags: [],
  imageUrl: undefined,
  locationId: "loc-1",
  status: "stored",
  lastScannedAt: FIXED_NOW,
  confidenceDecayDays: 30,
  checkedOutAt: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

const TestWrapper = ({ children }: { readonly children: ReactNode }) => (
  <I18nTestWrapper>
    <Provider store={createStore()}>{children}</Provider>
  </I18nTestWrapper>
);

describe("ConfidenceIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("confirmed状態でバッジ・バー・経過日数を表示する", () => {
    const garment = createTestGarment({
      lastScannedAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    render(<ConfidenceIndicator garment={garment} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText("確定")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText(/5日前/)).toBeInTheDocument();
  });

  it("uncertain状態で要確認バッジを表示する", () => {
    const garment = createTestGarment({
      lastScannedAt: FIXED_NOW - 15 * MS_PER_DAY,
    });
    render(<ConfidenceIndicator garment={garment} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText("要確認")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("unknown状態で不明バッジを表示する", () => {
    const garment = createTestGarment({
      lastScannedAt: FIXED_NOW - 25 * MS_PER_DAY,
    });
    render(<ConfidenceIndicator garment={garment} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText("不明")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("compactモードではバッジのみ表示しバーとテキストは非表示", () => {
    const garment = createTestGarment({
      lastScannedAt: FIXED_NOW - 5 * MS_PER_DAY,
    });
    render(<ConfidenceIndicator garment={garment} compact />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText("確定")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/前$/)).toBeNull();
  });

  it("経過日数が正しく表示される", () => {
    const garment = createTestGarment({
      lastScannedAt: FIXED_NOW - 12 * MS_PER_DAY,
    });
    render(<ConfidenceIndicator garment={garment} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText(/12日前/)).toBeInTheDocument();
  });
});
