"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { User, Archive, RotateCcw, Trash2, Edit3 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { Doll } from "@/types";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import { deleteDollAtom, restoreDollAtom } from "@/stores/dollAtoms";
import { requestArchiveAtom } from "@/stores/pendingArchiveAtoms";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import DollDetailInfoCard from "@/components/doll/DollDetailInfoCard";

type Props = {
  readonly doll: Doll;
};

const DollDetail = ({ doll }: Props) => {
  const { i18n } = useLingui();
  const router = useRouter();
  const deleteDoll = useSetAtom(deleteDollAtom);
  const restoreDoll = useSetAtom(restoreDollAtom);
  const requestArchive = useSetAtom(requestArchiveAtom);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [imageAspect, setImageAspect] = useState<"landscape" | "portrait">(
    "landscape",
  );
  const isArchived = doll.archivedAt !== undefined;
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.naturalHeight > img.naturalWidth) {
        setImageAspect("portrait");
      }
    },
    [],
  );

  const handleArchive = () => {
    requestArchive({ id: doll.id, entityType: "doll" });
    router.push("/dolls");
  };

  const handleRestore = async () => {
    await restoreDoll(doll.id);
    router.push("/dolls");
  };

  const handlePermanentDelete = async () => {
    await deleteDoll(doll.id);
    router.push("/archive");
  };

  return (
    <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease-out] lg:grid lg:grid-cols-2 lg:gap-8">
      <div
        className={`${imageAspect === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]"} overflow-hidden rounded-2xl bg-primary-50 lg:sticky lg:top-20`}
      >
        {doll.imageUrl !== undefined ? (
          <img
            src={doll.imageUrl}
            alt={doll.name}
            className="size-full object-contain"
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User className="size-16 text-primary-200" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{doll.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {i18n._(DOLL_SIZE_LABEL[doll.bodySize])}
          </p>
        </div>

        <DollDetailInfoCard doll={doll} />

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
              onClick={() => router.push(`/dolls/${doll.id}/edit`)}
            >
              <Edit3 className="size-4" />
              <Trans>編集</Trans>
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
          message={t`「${doll.name}」をアーカイブしますか？`}
          confirmLabel={t`アーカイブ`}
        />
        <ConfirmSheet
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handlePermanentDelete}
          title={t`完全に削除`}
          message={t`「${doll.name}」を完全に削除しますか？この操作は取り消せません。`}
          confirmLabel={t`削除`}
          confirmVariant="danger"
        />
      </div>
    </div>
  );
};

export default DollDetail;
