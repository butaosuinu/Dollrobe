"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Garment } from "@/types";
import GarmentCard from "@/components/garment/GarmentCard";
import { useGridColumns } from "@/hooks/useGridColumns";

type Props = {
  readonly garments: readonly Garment[];
};

const ESTIMATED_ROW_HEIGHT = 280;
const GRID_GAP = 12;
const OVERSCAN = 3;

const GarmentGrid = ({ garments }: Props) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = useGridColumns();
  const rowCount = Math.ceil(garments.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    gap: GRID_GAP,
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-16rem)] overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = garments.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                gap: `${GRID_GAP}px`,
              }}
            >
              {rowItems.map((garment) => (
                <div key={garment.id}>
                  <GarmentCard garment={garment} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GarmentGrid;
