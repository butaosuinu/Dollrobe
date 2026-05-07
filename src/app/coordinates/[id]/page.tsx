"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { Edit3, Shirt, Trash2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  coordinatesAtom,
  deleteCoordinateAtom,
  updateCoordinateAtom,
} from "@/stores/coordinateAtoms";
import { activeGarmentsAtom, garmentsAtom } from "@/stores/garmentAtoms";
import type { Coordinate, Garment } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import CoordinateBuilder, {
  type CoordinateBuilderSubmitData,
} from "@/components/coordinate/CoordinateBuilder";
import OriginBadge from "@/components/coordinate/OriginBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

type ViewProps = {
  readonly coordinate: Coordinate;
  readonly garments: readonly Garment[];
  readonly onStartEdit: () => void;
  readonly onDelete: () => Promise<void>;
};

const CoordinateView = ({
  coordinate,
  garments,
  onStartEdit,
  onDelete,
}: ViewProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const garmentById = new Map(garments.map((g) => [g.id, g]));
  const linkedGarments = coordinate.garmentIds
    .map((id) => garmentById.get(id))
    .filter((g): g is Garment => g !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{coordinate.name}</h2>
        <OriginBadge isAiGenerated={coordinate.isAiGenerated} />
      </div>

      {coordinate.memo !== undefined && (
        <Card>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            <Trans>メモ</Trans>
          </p>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {coordinate.memo}
          </p>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-sm font-medium text-text-secondary">
          <Trans>使用する服</Trans>
          <span className="ml-1 text-xs text-text-tertiary">
            ({linkedGarments.length})
          </span>
        </p>
        {linkedGarments.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            <Trans>関連する服がありません（削除された可能性があります）</Trans>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {linkedGarments.map((garment, index) => (
              <li key={garment.id}>
                <Link
                  href={`/garments/${garment.id}`}
                  className="flex flex-col gap-1.5"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-primary-50">
                    {garment.imageUrl !== undefined ? (
                      <img
                        src={garment.imageUrl}
                        alt={garment.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Shirt className="size-8 text-primary-200" />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-text-primary/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <span className="truncate text-xs font-medium text-text-primary">
                    {garment.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-2 pt-2 lg:flex-row">
        <Button variant="secondary" size="lg" fullWidth onClick={onStartEdit}>
          <Edit3 className="size-4" />
          <Trans>編集</Trans>
        </Button>
        <Button
          variant="danger"
          size="lg"
          fullWidth
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          <Trans>削除</Trans>
        </Button>
      </div>

      <ConfirmSheet
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={onDelete}
        title={t`コーデを削除`}
        message={t`「${coordinate.name}」を削除しますか？この操作は取り消せません。`}
        confirmLabel={t`削除`}
        confirmVariant="danger"
      />
    </div>
  );
};

const CoordinateDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const coordinates = useAtomValue(coordinatesAtom);
  const garments = useAtomValue(garmentsAtom);
  // 編集モード切替時に CoordinateBuilder 内の useAtomValue(activeGarmentsAtom) が
  // Suspense を起こさないよう、上流で先に解決させておく。
  useAtomValue(activeGarmentsAtom);
  const updateCoordinate = useSetAtom(updateCoordinateAtom);
  const deleteCoordinate = useSetAtom(deleteCoordinateAtom);
  const [isEditing, setIsEditing] = useState(false);

  const coordinate = coordinates.find((c) => c.id === params.id);
  if (coordinate === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-text-secondary">
          <Trans>コーデが見つかりません</Trans>
        </p>
        <button
          onClick={() => router.push("/coordinates")}
          className="text-sm font-medium text-primary-500"
        >
          <Trans>一覧に戻る</Trans>
        </button>
      </div>
    );
  }

  const handleUpdate = async (data: CoordinateBuilderSubmitData) => {
    await updateCoordinate({
      ...coordinate,
      name: data.name,
      memo: data.memo,
      garmentIds: data.garmentIds,
      updatedAt: Date.now(),
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteCoordinate(coordinate.id);
    router.push("/coordinates");
  };

  if (isEditing) {
    return (
      <CoordinateBuilder
        initial={coordinate}
        submitLabel={<Trans>更新する</Trans>}
        onSubmit={handleUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <CoordinateView
      coordinate={coordinate}
      garments={garments}
      onStartEdit={() => setIsEditing(true)}
      onDelete={handleDelete}
    />
  );
};

const CoordinateDetailPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-3xl">
      <PageHeader
        title={<Trans>コーデ詳細</Trans>}
        onBack={() => router.back()}
        size="md"
      />

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <CoordinateDetailContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default CoordinateDetailPage;
