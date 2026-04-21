import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import Pagination from "./Pagination";

const defaultProps = {
  pagination: {
    currentPage: 1,
    totalPages: 5,
    pageSize: 20 as const,
    totalCount: 100,
  },
  onChangePage: vi.fn(),
  onChangePageSize: vi.fn(),
};

const renderPagination = (
  overrides: Omit<Partial<typeof defaultProps>, "pagination"> & {
    pagination?: Partial<(typeof defaultProps)["pagination"]>;
  } = {},
) => {
  const { pagination: paginationOverrides, ...restOverrides } = overrides;
  const props = {
    ...defaultProps,
    ...restOverrides,
    pagination: { ...defaultProps.pagination, ...paginationOverrides },
  };
  return render(<Pagination {...props} />, {
    wrapper: I18nTestWrapper,
  });
};

describe("Pagination", () => {
  it("件数表示が正しい", () => {
    renderPagination();

    expect(screen.getByText("1-20 / 100件")).toBeInTheDocument();
  });

  it("2ページ目の件数表示が正しい", () => {
    renderPagination({
      pagination: { currentPage: 2 },
    });

    expect(screen.getByText("21-40 / 100件")).toBeInTheDocument();
  });

  it("ページ番号ボタンがデスクトップで表示される", () => {
    renderPagination();

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("1ページ目で前へボタンがdisabledになる", () => {
    renderPagination({ pagination: { currentPage: 1 } });

    screen.getAllByLabelText("前のページ").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("最終ページで次へボタンがdisabledになる", () => {
    renderPagination({
      pagination: { currentPage: 5 },
    });

    screen.getAllByLabelText("次のページ").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("次へボタンクリックでonChangePageが呼ばれる", async () => {
    const onChangePage = vi.fn();
    renderPagination({ onChangePage });
    const user = userEvent.setup();

    const nextButtons = screen.getAllByLabelText("次のページ");
    const firstNextButton = nextButtons[0];
    expect(firstNextButton).toBeDefined();
    if (firstNextButton === undefined) return;
    await user.click(firstNextButton);

    expect(onChangePage).toHaveBeenCalledWith(2);
  });

  it("ページサイズ変更でonChangePageSizeが呼ばれる", async () => {
    const onChangePageSize = vi.fn();
    renderPagination({ onChangePageSize });
    const user = userEvent.setup();

    const select = screen.getByLabelText("表示件数");
    await user.selectOptions(select, "50");

    expect(onChangePageSize).toHaveBeenCalledWith(50);
  });

  it("totalPages===1のときページ番号ボタンが非表示", () => {
    renderPagination({
      pagination: { totalPages: 1, totalCount: 10 },
    });

    expect(screen.queryByText("前へ")).not.toBeInTheDocument();
    expect(screen.queryByText("次へ")).not.toBeInTheDocument();
    expect(screen.getByText("1-10 / 10件")).toBeInTheDocument();
  });

  it("現在のページにaria-current=pageが付与される", () => {
    renderPagination({ pagination: { currentPage: 3 } });

    const pageButton = screen.getByRole("button", { name: "3" });
    expect(pageButton).toHaveAttribute("aria-current", "page");
  });

  it("多ページ時に省略記号が表示される", () => {
    renderPagination({
      pagination: { currentPage: 5, totalPages: 10, totalCount: 200 },
    });

    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThan(0);
  });
});
