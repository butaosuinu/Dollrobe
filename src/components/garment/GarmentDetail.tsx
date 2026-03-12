"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { Shirt, Trash2, Edit3, QrCode } from "lucide-react";
import type { Garment } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  GARMENT_STATUS,
  GARMENT_STATUS_LABEL,
} from "@/lib/constants";
import { deleteGarmentAtom } from "@/stores/garmentAtoms";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import ConfidenceBar from "@/components/confidence/ConfidenceBar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Props = {
  readonly garment: Garment;
};

const GarmentDetail = ({ garment }: Props) => {
  const router = useRouter();
  const deleteGarment = useSetAtom(deleteGarmentAtom);
  const confidence = getConfidence(garment);
  const label = getConfidenceLabel(confidence);

  const handleDelete = async () => {
    await deleteGarment(garment.id);
    router.push("/garments");
  };

  const lastScannedDate = new Date(garment.lastScannedAt).toLocaleDateString(
    "ja-JP",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

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
            {GARMENT_CATEGORY_LABEL[garment.category]} ・{" "}
            {DOLL_SIZE_LABEL[garment.dollSize]}
          </p>
        </div>
        <ConfidenceBadge label={label} />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">ステータス</span>
            <Badge
              variant={
                garment.status === GARMENT_STATUS.STORED
                  ? "confirmed"
                  : garment.status === GARMENT_STATUS.CHECKED_OUT
                    ? "uncertain"
                    : "unknown"
              }
            >
              {GARMENT_STATUS_LABEL[garment.status]}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">信頼度</span>
              <span className="text-xs text-text-tertiary">
                最終スキャン: {lastScannedDate}
              </span>
            </div>
            <ConfidenceBar confidence={confidence} />
          </div>
        </div>
      </Card>

      {garment.colors.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-text-secondary">色</p>
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
          <p className="mb-2 text-sm font-medium text-text-secondary">タグ</p>
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
          編集
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => {
            router.push(
              `/print?type=garment&ids=${garment.id}&names=${encodeURIComponent(garment.name)}`,
            );
          }}
        >
          <QrCode className="size-4" />
          QRを印刷
        </Button>
        <Button variant="danger" size="lg" fullWidth onClick={handleDelete}>
          <Trash2 className="size-4" />
          削除
        </Button>
      </div>
    </div>
  );
};

export default GarmentDetail;
