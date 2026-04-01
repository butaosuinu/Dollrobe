"use client";

import { useRef } from "react";
import Link from "next/link";
import { Shirt } from "lucide-react";
import clsx from "clsx";
import { useLingui } from "@lingui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Garment } from "@/types";
import { GARMENT_CATEGORY_LABEL, DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import ConfidenceIndicator from "@/components/confidence/ConfidenceIndicator";

type Props = {
  readonly garments: readonly Garment[];
};

const ESTIMATED_ROW_HEIGHT = 72;
const OVERSCAN = 5;

const GarmentList = ({ garments }: Props) => {
  const { i18n } = useLingui();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: garments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: OVERSCAN,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-16rem)] overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const garment = garments[virtualRow.index];
          if (garment === undefined) return undefined;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-2"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Link href={`/garments/${garment.id}`}>
                <div
                  className={clsx(
                    "flex items-center gap-3 rounded-xl border border-border-default bg-surface-overlay p-3 shadow-card",
                    "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                  )}
                >
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50">
                    {garment.imageUrl !== undefined ? (
                      <img
                        src={garment.imageUrl}
                        alt={garment.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Shirt className="size-6 text-primary-200" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-display text-sm font-bold">
                      {garment.name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {i18n._(GARMENT_CATEGORY_LABEL[garment.category])} ・{" "}
                      {garment.dollSizes
                        .map((size) => i18n._(DOLL_SIZE_LABEL[size]))
                        .join(" / ")}
                      {garment.brand !== undefined && ` ・ ${garment.brand}`}
                    </p>
                  </div>
                  <ConfidenceIndicator garment={garment} compact />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GarmentList;
