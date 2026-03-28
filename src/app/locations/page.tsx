"use client";

import { Suspense, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { LayoutGrid, Plus } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  storageCasesAtom,
  storageLocationsAtom,
  addStorageCaseWithLocationsAtom,
  updateStorageCaseAtom,
  deleteStorageCaseAtom,
} from "@/stores/locationAtoms";
import { garmentsAtom } from "@/stores/garmentAtoms";
import type { StorageCase, StorageCaseType } from "@/types";
import { STORAGE_CASE_TYPE } from "@/lib/constants";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StorageCaseCard from "@/components/location/StorageCaseCard";
import StorageCaseForm from "@/components/location/StorageCaseForm";
import StorageCaseEditForm from "@/components/location/StorageCaseEditForm";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

const TEMP_USER_ID = "user-1";

const LocationsContent = () => {
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const garments = useAtomValue(garmentsAtom);
  const addCase = useSetAtom(addStorageCaseWithLocationsAtom);
  const updateCase = useSetAtom(updateStorageCaseAtom);
  const deleteCase = useSetAtom(deleteStorageCaseAtom);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<StorageCase | undefined>(
    undefined,
  );
  const [deletingCase, setDeletingCase] = useState<StorageCase | undefined>(
    undefined,
  );

  const getDefaultName = (caseType: StorageCaseType) => {
    const prefix =
      caseType === STORAGE_CASE_TYPE.GRID ? "引き出し収納" : "ボックス";
    const sameTypeCount = cases.filter((c) => c.type === caseType).length;
    return `${prefix} ${sameTypeCount + 1}`;
  };

  const handleCreate = async (
    input:
      | {
          readonly type: "grid";
          readonly name: string;
          readonly description: string | undefined;
          readonly rows: number;
          readonly cols: number;
        }
      | {
          readonly type: "unit";
          readonly name: string;
          readonly description: string | undefined;
        },
  ) => {
    await addCase({ ...input, userId: TEMP_USER_ID });
    setIsCreateOpen(false);
  };

  const handleEdit = async (input: {
    readonly name: string;
    readonly description: string | undefined;
  }) => {
    if (editingCase === undefined) return;
    await updateCase({ ...editingCase, ...input });
    setEditingCase(undefined);
  };

  const handleDelete = async () => {
    if (deletingCase === undefined) return;
    await deleteCase(deletingCase.id);
    setDeletingCase(undefined);
  };

  return (
    <>
      <div className="hidden justify-end lg:flex">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-600"
        >
          <Plus className="size-4" />
          <Trans>ケースを追加</Trans>
        </button>
      </div>
      {cases.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t`まだ収納場所がありません`}
          description={t`衣装ケースを追加して、服の収納場所を管理しましょう`}
          actionLabel={t`ケースを追加`}
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
          {cases.map((storageCase) => {
            const caseLocations = locations.filter(
              (l) => l.caseId === storageCase.id,
            );
            return (
              <StorageCaseCard
                key={storageCase.id}
                storageCase={storageCase}
                locations={caseLocations}
                garments={garments}
                onEdit={() => setEditingCase(storageCase)}
                onDelete={() => setDeletingCase(storageCase)}
              />
            );
          })}
        </div>
      )}

      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95 lg:hidden"
        aria-label={t`ケースを追加`}
      >
        <Plus className="size-6" />
      </button>

      <BottomSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t`ケースを追加`}
      >
        <StorageCaseForm
          defaultGridName={getDefaultName(STORAGE_CASE_TYPE.GRID)}
          defaultUnitName={getDefaultName(STORAGE_CASE_TYPE.UNIT)}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={editingCase !== undefined}
        onClose={() => setEditingCase(undefined)}
        title={t`ケースを編集`}
      >
        {editingCase !== undefined && (
          <StorageCaseEditForm
            currentName={editingCase.name}
            currentDescription={editingCase.description}
            onSubmit={handleEdit}
            onCancel={() => setEditingCase(undefined)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={deletingCase !== undefined}
        onClose={() => setDeletingCase(undefined)}
        title={t`ケースを削除`}
      >
        {deletingCase !== undefined && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              <Trans>
                「{deletingCase.name}」を削除しますか？
                ケース内の服は「取り出し中」になります。
              </Trans>
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setDeletingCase(undefined)}
              >
                <Trans>キャンセル</Trans>
              </Button>
              <Button variant="danger" fullWidth onClick={handleDelete}>
                <Trans>削除</Trans>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
};

const LocationsPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>収納場所</Trans>
      </h2>
    </div>

    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        }
      >
        <LocationsContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default LocationsPage;
