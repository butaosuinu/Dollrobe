"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useLingui } from "@lingui/react";
import type { Doll } from "@/types";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import Card from "@/components/ui/Card";

type Props = {
  readonly doll: Doll;
};

const DollCard = ({ doll }: Props) => {
  const { i18n } = useLingui();

  return (
    <Link href={`/dolls/${doll.id}`}>
      <Card hoverable className="relative overflow-hidden">
        <div className="mb-3 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-primary-50">
          {doll.imageUrl !== undefined ? (
            <img
              src={doll.imageUrl}
              alt={doll.name}
              className="size-full object-cover"
            />
          ) : (
            <User className="size-10 text-primary-200" />
          )}
        </div>
        <p className="truncate font-display text-sm font-bold">{doll.name}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {i18n._(DOLL_SIZE_LABEL[doll.bodySize])}
        </p>
        {doll.headModel !== undefined && (
          <p className="mt-0.5 truncate text-xs text-text-tertiary">
            {doll.headModel}
          </p>
        )}
        {doll.customizer !== undefined && (
          <p className="mt-0.5 truncate text-xs text-text-tertiary">
            {doll.customizer}
          </p>
        )}
      </Card>
    </Link>
  );
};

export default DollCard;
