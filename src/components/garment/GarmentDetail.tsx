"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { Shirt, Archive, RotateCcw, Trash2, Edit3, QrCode } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { Garment } from "@/types";
import { GARMENT_STATUS } from "@/lib/constants";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  GARMENT_STATUS_LABEL,
} from "@/lib/i18n-labels";
import { deleteGarmentAtom, restoreGarmentAtom } from "@/stores/garmentAtoms";
import { requestArchiveAtom } from "@/stores/pendingArchiveAtoms";
import ConfidenceIndicator from "@/components/confidence/ConfidenceIndicator";
import GarmentLocationRow from "@/components/garment/GarmentLocationRow";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmSheet from "@/components/ui/ConfirmSheet";

type Props = {
  readonly garment: Garment;
};

const GarmentDetail = ({ garment }: Props) => {
  const { i18n } = useLingui();
  const router = useRouter();
  const deleteGarment = useSetAtom(deleteGarmentAtom);
  const restoreGarment = useSetAtom(restoreGarmentAtom);
  const requestArchive = useSetAtom(requestArchiveAtom);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const isArchived = garment.archivedAt !== undefined;

  const handleArchive = () => {
    requestArchive({ id: garment.id, entityType: "garment" });
    router.push("/garments");
  };

  const handleRestore = async () => {
    await restoreGarment(garment.id);
    router.push("/garments");
  };

  const handlePermanentDelete = async () => {
    await deleteGarment(garment.id);
    router.push("/archive");
  };

  return (
    <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease-out] lg:grid lg:grid-cols-2 lg:gap-8">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-primary-50 lg:sticky lg:top-20">
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

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">{garment.name}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {i18n._(GARMENT_CATEGORY_LABEL[garment.category])} ・{" "}
              {garment.dollSizes
                .map((size) => i18n._(DOLL_SIZE_LABEL[size]))
                .join(" / ")}
            </p>
            {garment.brand !== undefined && (
              <p className="mt-0.5 text-sm text-text-tertiary">
                {garment.brand}
              </p>
            )}
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

        <GarmentLocationRow garment={garment} />

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

        {garment.setContents !== undefined && (
          <Card>
            <p className="mb-2 text-sm font-medium text-text-secondary">
              <Trans>セット内容</Trans>
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {garment.setContents}
            </p>
          </Card>
        )}

        {garment.description !== undefined && (
          <Card>
            <p className="mb-2 text-sm font-medium text-text-secondary">
              <Trans>メモ</Trans>
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {garment.description}
            </p>
          </Card>
        )}

        {isArchived ? (
          <div className="flex flex-col gap-2 pt-2 lg:flex-row">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleRestore}
            >
              <RotateCcw className="size-4" />
              <Trans>復元</Trans>
            </Button>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              <Trans>完全に削除</Trans>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2 lg:flex-row">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => router.push(`/garments/${garment.id}/edit`)}
            >
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
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setIsArchiveConfirmOpen(true)}
            >
              <Archive className="size-4" />
              <Trans>アーカイブ</Trans>
            </Button>
          </div>
        )}

        <ConfirmSheet
          isOpen={isArchiveConfirmOpen}
          onClose={() => setIsArchiveConfirmOpen(false)}
          onConfirm={handleArchive}
          title={t`アーカイブ`}
          message={t`「${garment.name}」をアーカイブしますか？`}
          confirmLabel={t`アーカイブ`}
        />
        <ConfirmSheet
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handlePermanentDelete}
          title={t`完全に削除`}
          message={t`「${garment.name}」を完全に削除しますか？この操作は取り消せません。`}
          confirmLabel={t`削除`}
          confirmVariant="danger"
        />
      </div>
    </div>
  );
};

export default GarmentDetail;
