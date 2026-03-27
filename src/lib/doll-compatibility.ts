import type { DollSize, Garment } from "@/types";

export const canDollWear = ({
  dollBodySize,
  garmentSizes,
}: {
  readonly dollBodySize: DollSize;
  readonly garmentSizes: readonly DollSize[];
}): boolean => garmentSizes.some((s) => s === dollBodySize);

export const filterGarmentsForDoll = ({
  garments,
  dollBodySize,
}: {
  readonly garments: readonly Garment[];
  readonly dollBodySize: DollSize;
}): readonly Garment[] =>
  garments.filter((g) =>
    canDollWear({ dollBodySize, garmentSizes: g.dollSizes }),
  );
