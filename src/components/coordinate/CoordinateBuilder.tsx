"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowLeft, ArrowRight, Shirt, X as RemoveIcon } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { activeGarmentsAtom } from "@/stores/garmentAtoms";
import {
  COORDINATE_NAME_MAX_LENGTH,
  COORDINATE_MEMO_MAX_LENGTH,
} from "@/lib/constants";
import type { Coordinate, Garment } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import SearchInput from "@/components/ui/SearchInput";

export type CoordinateBuilderSubmitData = {
  readonly name: string;
  readonly memo: string | undefined;
  readonly garmentIds: readonly string[];
};

type Props = {
  readonly initial?: Coordinate;
  readonly submitLabel: React.ReactNode;
  readonly onSubmit: (data: CoordinateBuilderSubmitData) => Promise<void>;
  readonly onCancel?: () => void;
};

const swap = <T,>(items: readonly T[], i: number, j: number): readonly T[] => {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) return items;
  return items.map((item, k) => (k === i ? b : k === j ? a : item));
};

const filterGarments = (
  garments: readonly Garment[],
  rawQuery: string,
): readonly Garment[] => {
  const query = rawQuery.trim().toLowerCase();
  if (query === "") return garments;
  return garments.filter(
    (g) =>
      g.name.toLowerCase().includes(query) ||
      g.tags.some((tag) => tag.toLowerCase().includes(query)),
  );
};

type SelectedListProps = {
  readonly selectedGarments: readonly Garment[];
  readonly onMoveLeft: (index: number) => void;
  readonly onMoveRight: (index: number) => void;
  readonly onRemove: (index: number) => void;
};

const SelectedGarmentsList = ({
  selectedGarments,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: SelectedListProps) => {
  if (selectedGarments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default bg-surface-overlay px-3 py-4 text-center text-xs text-text-tertiary">
        <Trans>下のリストから服を選択してください</Trans>
      </p>
    );
  }
  const lastIndex = selectedGarments.length - 1;
  return (
    <ul className="flex flex-col gap-2">
      {selectedGarments.map((garment, index) => (
        <li
          key={garment.id}
          className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-overlay p-2"
        >
          <span className="w-5 shrink-0 text-center text-xs font-medium text-text-tertiary">
            {index + 1}
          </span>
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50">
            {garment.imageUrl === undefined ? (
              <Shirt className="size-4 text-primary-200" />
            ) : (
              <img
                src={garment.imageUrl}
                alt={garment.name}
                className="size-full object-cover"
              />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm">
            {garment.name}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t`前へ`}
              onClick={() => onMoveLeft(index)}
              disabled={index === 0}
              className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-primary-50 disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t`次へ`}
              onClick={() => onMoveRight(index)}
              disabled={index === lastIndex}
              className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-primary-50 disabled:opacity-30"
            >
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t`削除`}
              onClick={() => onRemove(index)}
              className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-danger"
            >
              <RemoveIcon className="size-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

const GarmentTile = ({
  garment,
  selected,
  onToggle,
}: {
  readonly garment: Garment;
  readonly selected: boolean;
  readonly onToggle: (id: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onToggle(garment.id)}
    aria-pressed={selected}
    className={clsx(
      "flex w-full flex-col items-center gap-1 rounded-lg border p-2 text-left transition-colors",
      selected
        ? "border-primary-500 bg-primary-50"
        : "border-border-default bg-surface-overlay hover:bg-primary-50",
    )}
  >
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-primary-50">
      {garment.imageUrl === undefined ? (
        <Shirt className="size-5 text-primary-200" />
      ) : (
        <img
          src={garment.imageUrl}
          alt={garment.name}
          className="size-full object-cover"
        />
      )}
    </div>
    <span className="line-clamp-2 w-full text-xs">{garment.name}</span>
  </button>
);

type PickerProps = {
  readonly allGarments: readonly Garment[];
  readonly filteredGarments: readonly Garment[];
  readonly selectedIds: readonly string[];
  readonly searchQuery: string;
  readonly onChangeSearch: (value: string) => void;
  readonly onToggle: (id: string) => void;
};

const GarmentPicker = ({
  allGarments,
  filteredGarments,
  selectedIds,
  searchQuery,
  onChangeSearch,
  onToggle,
}: PickerProps) => (
  <section className="flex flex-col gap-2">
    <p className="text-sm font-medium text-text-secondary">
      <Trans>服を選ぶ</Trans>
    </p>
    <SearchInput
      value={searchQuery}
      onChangeValue={onChangeSearch}
      placeholder={t`名前やタグで検索...`}
    />
    {allGarments.length === 0 ? (
      <p className="rounded-lg border border-dashed border-border-default px-3 py-6 text-center text-xs text-text-tertiary">
        <Trans>登録された服がありません</Trans>
      </p>
    ) : filteredGarments.length === 0 ? (
      <p className="py-4 text-center text-xs text-text-tertiary">
        <Trans>一致する服が見つかりません</Trans>
      </p>
    ) : (
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {filteredGarments.map((garment) => (
          <li key={garment.id}>
            <GarmentTile
              garment={garment}
              selected={selectedIds.includes(garment.id)}
              onToggle={onToggle}
            />
          </li>
        ))}
      </ul>
    )}
  </section>
);

type BuilderState = {
  readonly allGarments: readonly Garment[];
  readonly selectedIds: readonly string[];
  readonly selectedGarments: readonly Garment[];
  readonly filteredGarments: readonly Garment[];
  readonly name: string;
  readonly memo: string;
  readonly searchQuery: string;
  readonly isValid: boolean;
  readonly setName: (value: string) => void;
  readonly setMemo: (value: string) => void;
  readonly setSearchQuery: (value: string) => void;
  readonly toggleGarment: (id: string) => void;
  readonly moveLeft: (index: number) => void;
  readonly moveRight: (index: number) => void;
  readonly removeAt: (index: number) => void;
  readonly handleSubmit: (e: React.SyntheticEvent) => Promise<void>;
};

const useCoordinateBuilder = (
  initial: Coordinate | undefined,
  onSubmit: (data: CoordinateBuilderSubmitData) => Promise<void>,
): BuilderState => {
  const allGarments = useAtomValue(activeGarmentsAtom);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    initial?.garmentIds ?? [],
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const garmentById = useMemo(
    () => new Map(allGarments.map((g) => [g.id, g])),
    [allGarments],
  );
  const selectedGarments = useMemo(
    () =>
      selectedIds
        .map((id) => garmentById.get(id))
        .filter((g): g is Garment => g !== undefined),
    [selectedIds, garmentById],
  );
  const filteredGarments = useMemo(
    () => filterGarments(allGarments, searchQuery),
    [allGarments, searchQuery],
  );

  const trimmedName = name.trim();
  const isValid = trimmedName !== "" && selectedIds.length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    await onSubmit({
      name: trimmedName,
      memo: memo.trim() === "" ? undefined : memo.trim(),
      garmentIds: [...selectedIds],
    }).catch(() => undefined);
    setIsSubmitting(false);
  };

  return {
    allGarments,
    selectedIds,
    selectedGarments,
    filteredGarments,
    name,
    memo,
    searchQuery,
    isValid,
    setName,
    setMemo,
    setSearchQuery,
    toggleGarment: (id) =>
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
      ),
    moveLeft: (index) => setSelectedIds((prev) => swap(prev, index, index - 1)),
    moveRight: (index) =>
      setSelectedIds((prev) => swap(prev, index, index + 1)),
    removeAt: (index) =>
      setSelectedIds((prev) => prev.filter((_, i) => i !== index)),
    handleSubmit,
  };
};

const CoordinateBuilder = ({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) => {
  const s = useCoordinateBuilder(initial, onSubmit);

  return (
    <form onSubmit={s.handleSubmit} className="flex flex-col gap-5">
      <Input
        label={t`コーデ名`}
        placeholder={t`お出かけコーデ`}
        value={s.name}
        onChange={(e) => s.setName(e.target.value)}
        maxLength={COORDINATE_NAME_MAX_LENGTH}
        required
      />

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-secondary">
          <Trans>選択中の服</Trans>
          {s.selectedGarments.length > 0 && (
            <span className="ml-1 text-xs text-text-tertiary">
              ({s.selectedGarments.length})
            </span>
          )}
        </p>
        <SelectedGarmentsList
          selectedGarments={s.selectedGarments}
          onMoveLeft={s.moveLeft}
          onMoveRight={s.moveRight}
          onRemove={s.removeAt}
        />
      </section>

      <GarmentPicker
        allGarments={s.allGarments}
        filteredGarments={s.filteredGarments}
        selectedIds={s.selectedIds}
        searchQuery={s.searchQuery}
        onChangeSearch={s.setSearchQuery}
        onToggle={s.toggleGarment}
      />

      <Textarea
        label={t`メモ`}
        id="coordinate-memo"
        placeholder={t`シーズン、シーン、組み合わせの理由など`}
        value={s.memo}
        onChange={(e) => s.setMemo(e.target.value)}
        maxLength={COORDINATE_MEMO_MAX_LENGTH}
        rows={3}
      />

      <div className="flex flex-col gap-2 lg:flex-row">
        {onCancel !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={onCancel}
          >
            <Trans>キャンセル</Trans>
          </Button>
        )}
        <Button type="submit" size="lg" fullWidth disabled={!s.isValid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CoordinateBuilder;
