"use client";

import Link from "next/link";
import { Shirt } from "lucide-react";
import type { Coordinate, Garment } from "@/types";
import Card from "@/components/ui/Card";
import OriginBadge from "@/components/coordinate/OriginBadge";

type Props = {
  readonly coordinate: Coordinate;
  readonly garments: readonly Garment[];
};

const MAX_THUMBNAIL_COUNT = 5;

const CoordinateCard = ({ coordinate, garments }: Props) => {
  const garmentById = new Map(garments.map((g) => [g.id, g]));
  const linkedGarments = coordinate.garmentIds
    .map((id) => garmentById.get(id))
    .filter((g): g is Garment => g !== undefined);
  const visibleGarments = linkedGarments.slice(0, MAX_THUMBNAIL_COUNT);
  const remainingCount = linkedGarments.length - visibleGarments.length;

  return (
    <Link href={`/coordinates/${coordinate.id}`}>
      <Card hoverable className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-display text-sm font-bold">
            {coordinate.name}
          </p>
          <OriginBadge isAiGenerated={coordinate.isAiGenerated} />
        </div>
        <div className="flex items-center gap-1.5">
          {visibleGarments.map((garment) => (
            <div
              key={garment.id}
              className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50"
            >
              {garment.imageUrl !== undefined ? (
                <img
                  src={garment.imageUrl}
                  alt={garment.name}
                  className="size-full object-cover"
                />
              ) : (
                <Shirt className="size-5 text-primary-200" />
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-text-tertiary">
              +{remainingCount}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default CoordinateCard;
