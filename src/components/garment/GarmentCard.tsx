"use client";

import Link from "next/link";
import { Shirt } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { Garment } from "@/types";
import { GARMENT_CATEGORY_LABEL, DOLL_SIZE_LABEL } from "@/lib/constants";
import ConfidenceIndicator from "@/components/confidence/ConfidenceIndicator";
import Card from "@/components/ui/Card";

type Props = {
  readonly garment: Garment;
};

const GarmentCard = ({ garment }: Props) => {
  const { i18n } = useLingui();
  const isCheckedOut = garment.status === "checked_out";

  return (
    <Link href={`/garments/${garment.id}`}>
      <Card hoverable className="relative overflow-hidden">
        <div
          className={clsx(
            "mb-3 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-primary-50",
            isCheckedOut && "opacity-60",
          )}
        >
          {garment.imageUrl !== undefined ? (
            <img
              src={garment.imageUrl}
              alt={garment.name}
              className="size-full object-cover"
            />
          ) : (
            <Shirt className="size-10 text-primary-200" />
          )}
        </div>
        {isCheckedOut && (
          <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <Trans>取り出し中</Trans>
          </div>
        )}
        <p className="truncate font-display text-sm font-bold">
          {garment.name}
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {i18n._(GARMENT_CATEGORY_LABEL[garment.category])} ・{" "}
          {i18n._(DOLL_SIZE_LABEL[garment.dollSize])}
        </p>
        <div className="mt-2">
          <ConfidenceIndicator garment={garment} compact />
        </div>
      </Card>
    </Link>
  );
};

export default GarmentCard;
