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
import type { StorageCase } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StorageCaseCard from "@/components/location/StorageCaseCard";
import StorageCaseForm from "@/components/location/StorageCaseForm";
import StorageCaseEditForm from "@/components/location/StorageCaseEditForm";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import BottomSheet from "@/components/ui/BottomSheet";
import ConfirmSheet from "@/components/ui/ConfirmSheet";

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

  const handleCreate = async (input: {
    readonly name: string;
    readonly rows: number;
    readonly cols: number;
  }) => {
    await addCase({ ...input, userId: TEMP_USER_ID });
    setIsCreateOpen(false);
  };

  const handleEdit = async (name: string) => {
    if (editingCase === undefined) return;
    await updateCase({ ...editingCase, name });
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
            onSubmit={handleEdit}
            onCancel={() => setEditingCase(undefined)}
          />
        )}
      </BottomSheet>

      <ConfirmSheet
        isOpen={deletingCase !== undefined}
        onClose={() => setDeletingCase(undefined)}
        onConfirm={handleDelete}
        title={t`ケースを削除`}
        message={
          deletingCase !== undefined
            ? t`「${deletingCase.name}」を削除しますか？ケース内の服は「取り出し中」になります。`
            : ""
        }
        confirmLabel={t`削除`}
        confirmVariant="danger"
      />
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
