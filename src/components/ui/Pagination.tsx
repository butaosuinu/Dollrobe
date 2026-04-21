"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { PAGE_SIZES } from "@/lib/constants";
import type { PageSize } from "@/lib/constants";

const ELLIPSIS = "ellipsis" as const;
type PageItem = number | typeof ELLIPSIS;

const MAX_VISIBLE_PAGES = 7;
const EDGE_THRESHOLD = 4;
const INNER_PAGE_COUNT = MAX_VISIBLE_PAGES - 2;

const getVisiblePages = ({
  currentPage,
  totalPages,
}: {
  readonly currentPage: number;
  readonly totalPages: number;
}): readonly PageItem[] => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= EDGE_THRESHOLD) {
    return [
      ...Array.from({ length: INNER_PAGE_COUNT }, (_, i) => i + 1),
      ELLIPSIS,
      totalPages,
    ];
  }

  if (currentPage >= totalPages - EDGE_THRESHOLD + 1) {
    return [
      1,
      ELLIPSIS,
      ...Array.from(
        { length: INNER_PAGE_COUNT },
        (_, i) => totalPages - INNER_PAGE_COUNT + 1 + i,
      ),
    ];
  }

  return [
    1,
    ELLIPSIS,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    ELLIPSIS,
    totalPages,
  ];
};

export type PaginationData = {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly pageSize: PageSize;
  readonly totalCount: number;
};

type Props = {
  readonly pagination: PaginationData;
  readonly onChangePage: (page: number) => void;
  readonly onChangePageSize: (size: PageSize) => void;
};

const isPageSize = (value: number): value is PageSize =>
  (PAGE_SIZES as readonly number[]).includes(value);

const Pagination = ({ pagination, onChangePage, onChangePageSize }: Props) => {
  const { currentPage, totalPages, pageSize, totalCount } = pagination;
  const { i18n } = useLingui();

  const visiblePages = getVisiblePages({ currentPage, totalPages });
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const displayStart = (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <nav
      aria-label={i18n._(t`ページネーション`)}
      className="flex flex-col gap-3"
    >
      {totalPages > 1 && (
        <>
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => onChangePage(currentPage - 1)}
              disabled={isFirstPage}
              aria-label={i18n._(t`前のページ`)}
              className={clsx(
                "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                isFirstPage
                  ? "pointer-events-none opacity-50"
                  : "text-text-secondary hover:bg-primary-50",
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm text-text-secondary">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onChangePage(currentPage + 1)}
              disabled={isLastPage}
              aria-label={i18n._(t`次のページ`)}
              className={clsx(
                "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                isLastPage
                  ? "pointer-events-none opacity-50"
                  : "text-text-secondary hover:bg-primary-50",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="hidden items-center justify-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => onChangePage(currentPage - 1)}
              disabled={isFirstPage}
              aria-label={i18n._(t`前のページ`)}
              className={clsx(
                "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
                isFirstPage
                  ? "pointer-events-none opacity-50"
                  : "text-text-secondary hover:bg-primary-50",
              )}
            >
              <ChevronLeft className="size-3.5" />
              <Trans>前へ</Trans>
            </button>

            {visiblePages.map((item, i) =>
              item === ELLIPSIS ? (
                <span
                  key={`ellipsis-${i}`}
                  className="inline-flex size-8 items-center justify-center text-xs text-text-tertiary"
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChangePage(item)}
                  aria-current={item === currentPage ? "page" : undefined}
                  className={clsx(
                    "inline-flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    item === currentPage
                      ? "bg-primary-500 text-text-inverse"
                      : "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
                  )}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onChangePage(currentPage + 1)}
              disabled={isLastPage}
              aria-label={i18n._(t`次のページ`)}
              className={clsx(
                "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
                isLastPage
                  ? "pointer-events-none opacity-50"
                  : "text-text-secondary hover:bg-primary-50",
              )}
            >
              <Trans>次へ</Trans>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          <Trans>
            {displayStart}-{displayEnd} / {totalCount}件
          </Trans>
        </p>
        <select
          value={pageSize}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (isPageSize(parsed)) {
              onChangePageSize(parsed);
            }
          }}
          aria-label={i18n._(t`表示件数`)}
          className="h-8 rounded-lg border border-border-default bg-surface-overlay px-2 text-xs text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {i18n._(t`${size}件表示`)}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
};

export default Pagination;
