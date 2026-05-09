"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowDown, ArrowUp, Shirt, X as RemoveIcon } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { activeGarmentsAtom, garmentsAtom } from "@/stores/garmentAtoms";
import {
  COORDINATE_NAME_MAX_LENGTH,
  COORDINATE_MEMO_MAX_LENGTH,
} from "@/lib/constants";
import { GARMENT_CATEGORY_LABEL } from "@/lib/i18n-labels";
import type { Coordinate, Garment } from "@/types";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
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
  readonly onMoveUp: (id: string) => void;
  readonly onMoveDown: (id: string) => void;
  readonly onRemove: (id: string) => void;
};

const SelectedGarmentsList = ({
  selectedGarments,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SelectedListProps) => {
  const { i18n } = useLingui();
  const lastIndex = selectedGarments.length - 1;
  return (
    <ul className="flex flex-col gap-2.5">
      {selectedGarments.map((garment, index) => (
        <li
          key={garment.id}
          className="flex items-center gap-3 rounded-lg border border-primary-300 bg-surface-overlay p-2.5 shadow-sm"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-text-inverse">
              {index + 1}
            </span>
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary-50">
              {garment.imageUrl === undefined ? (
                <Shirt className="size-5 text-primary-300" />
              ) : (
                <img
                  src={garment.imageUrl}
                  alt={garment.name}
                  className="size-full object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-text-primary">
                {garment.name}
              </span>
              <span className="truncate text-[11px] text-text-tertiary">
                {i18n._(GARMENT_CATEGORY_LABEL[garment.category])}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 border-l border-primary-200/60 pl-2">
            <IconButton
              icon={ArrowUp}
              label={t`上へ`}
              size="sm"
              onClick={() => onMoveUp(garment.id)}
              disabled={index === 0}
            />
            <IconButton
              icon={ArrowDown}
              label={t`下へ`}
              size="sm"
              onClick={() => onMoveDown(garment.id)}
              disabled={index === lastIndex}
            />
            <IconButton
              icon={RemoveIcon}
              label={t`削除`}
              size="sm"
              variant="danger"
              onClick={() => onRemove(garment.id)}
            />
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
}) => {
  const { i18n } = useLingui();
  return (
    <button
      type="button"
      onClick={() => onToggle(garment.id)}
      aria-pressed={selected}
      className={clsx(
        "flex w-full flex-col items-stretch gap-1 rounded-lg border p-2 text-left transition-colors",
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
      <span className="w-full truncate text-[10px] text-text-tertiary">
        {i18n._(GARMENT_CATEGORY_LABEL[garment.category])}
      </span>
    </button>
  );
};

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
  readonly submitError: string | undefined;
  readonly setName: (value: string) => void;
  readonly setMemo: (value: string) => void;
  readonly setSearchQuery: (value: string) => void;
  readonly toggleGarment: (id: string) => void;
  readonly moveUp: (id: string) => void;
  readonly moveDown: (id: string) => void;
  readonly removeAt: (id: string) => void;
  readonly handleSubmit: (e: React.SyntheticEvent) => Promise<void>;
};

const useCoordinateBuilder = ({
  initial,
  onSubmit,
}: {
  readonly initial: Coordinate | undefined;
  readonly onSubmit: (data: CoordinateBuilderSubmitData) => Promise<void>;
}): BuilderState => {
  const allGarments = useAtomValue(activeGarmentsAtom);
  const allKnownGarments = useAtomValue(garmentsAtom);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    initial?.garmentIds ?? [],
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const garmentById = useMemo(
    () => new Map(allGarments.map((g) => [g.id, g])),
    [allGarments],
  );
  const knownGarmentIds = useMemo(
    () => new Set(allKnownGarments.map((g) => g.id)),
    [allKnownGarments],
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
  const isValid =
    trimmedName !== "" && selectedGarments.length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    setSubmitError(undefined);
    const caughtError = await onSubmit({
      name: trimmedName,
      memo: memo.trim() === "" ? undefined : memo.trim(),
      garmentIds: selectedIds.filter((id) => knownGarmentIds.has(id)),
    }).catch((err: unknown) => err);
    setIsSubmitting(false);
    if (caughtError !== undefined) {
      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : t`保存に失敗しました`,
      );
    }
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
    submitError,
    setName,
    setMemo,
    setSearchQuery,
    toggleGarment: (id) =>
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
      ),
    moveUp: (id) =>
      setSelectedIds((prev) => {
        const i = prev.indexOf(id);
        if (i === -1) return prev;
        const prevVisible = prev
          .slice(0, i)
          .filter((pid) => garmentById.has(pid))
          .pop();
        if (prevVisible === undefined) return prev;
        return swap(prev, i, prev.indexOf(prevVisible));
      }),
    moveDown: (id) =>
      setSelectedIds((prev) => {
        const i = prev.indexOf(id);
        if (i === -1) return prev;
        const nextVisible = prev
          .slice(i + 1)
          .find((pid) => garmentById.has(pid));
        if (nextVisible === undefined) return prev;
        return swap(prev, i, prev.indexOf(nextVisible));
      }),
    removeAt: (id) =>
      setSelectedIds((prev) => prev.filter((pid) => pid !== id)),
    handleSubmit,
  };
};

const CoordinateBuilder = ({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) => {
  const s = useCoordinateBuilder({ initial, onSubmit });

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

      <GarmentPicker
        allGarments={s.allGarments}
        filteredGarments={s.filteredGarments}
        selectedIds={s.selectedIds}
        searchQuery={s.searchQuery}
        onChangeSearch={s.setSearchQuery}
        onToggle={s.toggleGarment}
      />

      {s.selectedGarments.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-text-secondary">
              <Trans>選択中の服</Trans>
            </p>
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
              {s.selectedGarments.length}
            </span>
          </div>
          <SelectedGarmentsList
            selectedGarments={s.selectedGarments}
            onMoveUp={s.moveUp}
            onMoveDown={s.moveDown}
            onRemove={s.removeAt}
          />
        </section>
      )}

      <Textarea
        label={t`メモ`}
        id="coordinate-memo"
        placeholder={t`シーズン、シーン、組み合わせの理由など`}
        value={s.memo}
        onChange={(e) => s.setMemo(e.target.value)}
        maxLength={COORDINATE_MEMO_MAX_LENGTH}
        rows={3}
      />

      {s.submitError !== undefined && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger"
        >
          {s.submitError}
        </p>
      )}

      <div className="flex flex-col gap-2 lg:flex-row">
        {onCancel !== undefined && (
          <Button
            type="button"
            variant="secondary"
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
