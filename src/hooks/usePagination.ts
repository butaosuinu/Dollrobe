"use client";

import { useState, useMemo, useRef } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { PageSize } from "@/lib/constants";

type UsePaginationArgs<T> = {
  readonly items: readonly T[];
  readonly initialPageSize?: PageSize;
};

type PaginationData<T> = {
  readonly paginatedItems: readonly T[];
  readonly currentPage: number;
  readonly totalPages: number;
  readonly pageSize: PageSize;
  readonly totalCount: number;
};

type PaginationActions = {
  readonly onChangePage: (page: number) => void;
  readonly onChangePageSize: (size: PageSize) => void;
};

type UsePaginationResult<T> = PaginationData<T> & PaginationActions;

const usePagination = <T>({
  items,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UsePaginationArgs<T>): UsePaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const prevItemsRef = useRef(items);

  const { length: totalCount } = items;

  if (prevItemsRef.current !== items) {
    prevItemsRef.current = items;
    setCurrentPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const onChangePage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const onChangePageSize = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    pageSize,
    totalCount,
    onChangePage,
    onChangePageSize,
  };
};

export default usePagination;
