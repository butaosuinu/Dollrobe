"use client";

import Link from "next/link";
import { useAtomValue } from "jotai";
import { Shirt } from "lucide-react";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { GARMENT_CATEGORY_LABEL } from "@/lib/constants";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import Card from "@/components/ui/Card";

const RECENT_COUNT = 8;

const RecentItems = () => {
  const garments = useAtomValue(garmentsAtom);

  const recentGarments = [...garments]
    .sort((a, b) => b.lastScannedAt - a.lastScannedAt)
    .slice(0, RECENT_COUNT);

  if (recentGarments.length === 0) {
    return undefined;
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-text-secondary">
          最近のアイテム
        </h2>
        <Link
          href="/garments"
          className="text-xs font-medium text-primary-500 transition-colors hover:text-primary-600"
        >
          すべて見る
        </Link>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scroll-snap-type:x_mandatory]">
        {recentGarments.map((garment) => {
          const confidence = getConfidence(garment);
          const label = getConfidenceLabel(confidence);

          return (
            <Link
              key={garment.id}
              href={`/garments/${garment.id}`}
              className="flex-shrink-0 [scroll-snap-align:start]"
            >
              <Card hoverable className="w-36">
                <div className="mb-2 flex aspect-square items-center justify-center rounded-lg bg-primary-50">
                  {garment.imageUrl !== undefined ? (
                    <img
                      src={garment.imageUrl}
                      alt={garment.name}
                      className="size-full rounded-lg object-cover"
                    />
                  ) : (
                    <Shirt className="size-8 text-primary-200" />
                  )}
                </div>
                <p className="truncate font-display text-sm font-bold">
                  {garment.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  {GARMENT_CATEGORY_LABEL[garment.category]}
                </p>
                <div className="mt-1.5">
                  <ConfidenceBadge label={label} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RecentItems;
