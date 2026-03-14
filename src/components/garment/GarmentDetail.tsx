"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { Shirt, Trash2, Edit3, QrCode } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { Garment } from "@/types";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  GARMENT_STATUS,
  GARMENT_STATUS_LABEL,
} from "@/lib/constants";
import { deleteGarmentAtom } from "@/stores/garmentAtoms";
import ConfidenceIndicator from "@/components/confidence/ConfidenceIndicator";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Props = {
  readonly garment: Garment;
};

const GarmentDetail = ({ garment }: Props) => {
  const { i18n } = useLingui();
  const router = useRouter();
  const deleteGarment = useSetAtom(deleteGarmentAtom);

  const handleDelete = async () => {
    await deleteGarment(garment.id);
    router.push("/garments");
  };

  return (
    <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease-out]">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-primary-50">
        {garment.imageUrl !== undefined ? (
          <img
            src={garment.imageUrl}
            alt={garment.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Shirt className="size-16 text-primary-200" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{garment.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {i18n._(GARMENT_CATEGORY_LABEL[garment.category])} ・{" "}
            {i18n._(DOLL_SIZE_LABEL[garment.dollSize])}
          </p>
        </div>
        <ConfidenceIndicator garment={garment} compact />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              <Trans>ステータス</Trans>
            </span>
            <Badge
              variant={
                garment.status === GARMENT_STATUS.STORED
                  ? "confirmed"
                  : garment.status === GARMENT_STATUS.CHECKED_OUT
                    ? "uncertain"
                    : "unknown"
              }
            >
              {i18n._(GARMENT_STATUS_LABEL[garment.status])}
            </Badge>
          </div>
          <ConfidenceIndicator garment={garment} />
        </div>
      </Card>

      {garment.colors.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            <Trans>色</Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            {garment.colors.map((color) => (
              <span
                key={color}
                className="size-7 rounded-full border border-border-default"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </Card>
      )}

      {garment.tags.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            <Trans>タグ</Trans>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {garment.tags.map((tag) => (
              <Badge key={tag} variant="primary">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button variant="secondary" size="lg" fullWidth>
          <Edit3 className="size-4" />
          <Trans>編集</Trans>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => {
            const params = new URLSearchParams();
            params.set("type", "garment");
            params.append("ids", garment.id);
            params.append("names", garment.name);
            router.push(`/print?${params.toString()}`);
          }}
        >
          <QrCode className="size-4" />
          <Trans>QRを印刷</Trans>
        </Button>
        <Button variant="danger" size="lg" fullWidth onClick={handleDelete}>
          <Trash2 className="size-4" />
          <Trans>削除</Trans>
        </Button>
      </div>
    </div>
  );
};

export default GarmentDetail;
