import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePagination from "./usePagination";

const createItems = (count: number): readonly number[] =>
  Array.from({ length: count }, (_, i) => i + 1);

describe("usePagination", () => {
  it("20件以下で1ページに収まる", () => {
    const items = createItems(15);
    const { result } = renderHook(() => usePagination({ items }));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.totalCount).toBe(15);
    expect(result.current.paginatedItems).toEqual(items);
  });

  it("50件でpageSize=20の場合、totalPages=3", () => {
    const items = createItems(50);
    const { result } = renderHook(() => usePagination({ items }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems).toEqual(createItems(20));
  });

  it("onChangePageでページ遷移できる", () => {
    const items = createItems(50);
    const { result } = renderHook(() => usePagination({ items }));

    act(() => {
      result.current.onChangePage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 21),
    );
  });

  it("最終ページでは残りのアイテムのみ返す", () => {
    const items = createItems(50);
    const { result } = renderHook(() => usePagination({ items }));

    act(() => {
      result.current.onChangePage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.paginatedItems).toEqual(
      Array.from({ length: 10 }, (_, i) => i + 41),
    );
  });

  it("onChangePageSizeでページが1にリセットされる", () => {
    const items = createItems(100);
    const { result } = renderHook(() => usePagination({ items }));

    act(() => {
      result.current.onChangePage(3);
    });
    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.onChangePageSize(50);
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(50);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(50);
  });

  it("items が0件のとき totalPages=1、paginatedItems=[]", () => {
    const items: readonly number[] = [];
    const { result } = renderHook(() => usePagination({ items }));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.paginatedItems).toEqual([]);
  });

  it("範囲外のページ番号はクランプされる（下限）", () => {
    const items = createItems(50);
    const { result } = renderHook(() => usePagination({ items }));

    act(() => {
      result.current.onChangePage(0);
    });

    expect(result.current.currentPage).toBe(1);
  });

  it("範囲外のページ番号はクランプされる（上限）", () => {
    const items = createItems(50);
    const { result } = renderHook(() => usePagination({ items }));

    act(() => {
      result.current.onChangePage(100);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it("件数が同じでも配列参照が変わればページ1にリセットされる", () => {
    const itemsA = createItems(60);
    const itemsB = createItems(60);
    const { result, rerender } = renderHook(
      ({ items }) => usePagination({ items }),
      { initialProps: { items: itemsA } },
    );

    act(() => {
      result.current.onChangePage(3);
    });
    expect(result.current.currentPage).toBe(3);

    rerender({ items: itemsB });

    expect(result.current.currentPage).toBe(1);
  });

  it("items.lengthが減ったときページが1にリセットされる", () => {
    const initialItems = createItems(100);
    const { result, rerender } = renderHook(
      ({ items }) => usePagination({ items }),
      { initialProps: { items: initialItems } },
    );

    act(() => {
      result.current.onChangePage(5);
    });
    expect(result.current.currentPage).toBe(5);

    rerender({ items: createItems(10) });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it("initialPageSizeで初期ページサイズを設定できる", () => {
    const items = createItems(200);
    const { result } = renderHook(() =>
      usePagination({ items, initialPageSize: 50 }),
    );

    expect(result.current.pageSize).toBe(50);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.paginatedItems).toHaveLength(50);
  });
});
