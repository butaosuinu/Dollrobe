import Link from "next/link";
import { Shirt } from "lucide-react";
import clsx from "clsx";
import type { Garment } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { GARMENT_CATEGORY_LABEL, DOLL_SIZE_LABEL } from "@/lib/constants";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";

type Props = {
  readonly garments: readonly Garment[];
};

const GarmentList = ({ garments }: Props) => (
  <div className="flex flex-col gap-2">
    {garments.map((garment, i) => {
      const confidence = getConfidence(garment);
      const label = getConfidenceLabel(confidence);

      return (
        <Link
          key={garment.id}
          href={`/garments/${garment.id}`}
          className="animate-[slide-up_0.3s_ease-out_both]"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <div
            className={clsx(
              "flex items-center gap-3 rounded-xl border border-border-default bg-surface-overlay p-3 shadow-card",
              "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
            )}
          >
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50">
              {garment.imageUrl !== undefined ? (
                <img src={garment.imageUrl} alt={garment.name} className="size-full object-cover" />
              ) : (
                <Shirt className="size-6 text-primary-200" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-display text-sm font-bold">{garment.name}</p>
              <p className="text-xs text-text-tertiary">
                {GARMENT_CATEGORY_LABEL[garment.category]} ・ {DOLL_SIZE_LABEL[garment.dollSize]}
              </p>
            </div>
            <ConfidenceBadge label={label} />
          </div>
        </Link>
      );
    })}
  </div>
);

export default GarmentList;
