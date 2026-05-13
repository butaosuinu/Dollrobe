"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { Shirt } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Plural } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { DollSize } from "@/types";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { filterGarmentsForDoll } from "@/lib/doll-compatibility";
import { GARMENT_CATEGORY_LABEL, DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import Link from "next/link";

type Props = {
  readonly dollBodySize: DollSize;
};

const CompatibleGarmentList = ({ dollBodySize }: Props) => {
  const { i18n } = useLingui();
  const garments = useAtomValue(garmentsAtom);

  const compatible = useMemo(
    () => filterGarmentsForDoll({ garments, dollBodySize }),
    [garments, dollBodySize],
  );

  if (compatible.length === 0) {
    return (
      <EmptyState
        icon={Shirt}
        title={t`着用可能な服がありません`}
        description={t`${i18n._(DOLL_SIZE_LABEL[dollBodySize])} サイズ対応の服を登録すると、ここに表示されます`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {compatible.map((garment) => (
        <Link key={garment.id} href={`/garments/${garment.id}`}>
          <Card hoverable className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50">
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{garment.name}</p>
              <p className="text-xs text-text-tertiary">
                {i18n._(GARMENT_CATEGORY_LABEL[garment.category])}
              </p>
            </div>
          </Card>
        </Link>
      ))}
      <p className="text-center text-xs text-text-tertiary">
        <Plural
          value={compatible.length}
          one="#着の服が着用可能"
          other="#着の服が着用可能"
        />
      </p>
    </div>
  );
};

export default CompatibleGarmentList;
