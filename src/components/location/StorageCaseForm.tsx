"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { StorageCaseType } from "@/types";
import {
  CASE_NAME_MAX_LENGTH,
  CASE_DESCRIPTION_MAX_LENGTH,
  GRID_SIZE_MIN,
  GRID_SIZE_MAX,
  STORAGE_CASE_TYPE,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type CreateCaseInput =
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
    };

type Props = {
  readonly defaultGridName: string;
  readonly defaultUnitName: string;
  readonly onSubmit: (input: CreateCaseInput) => void;
  readonly onCancel: () => void;
};

const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 3;

const clampGridSize = (value: number): number =>
  Math.max(GRID_SIZE_MIN, Math.min(GRID_SIZE_MAX, value));

const StorageCaseForm = ({
  defaultGridName,
  defaultUnitName,
  onSubmit,
  onCancel,
}: Props) => {
  const [type, setType] = useState<StorageCaseType>(STORAGE_CASE_TYPE.GRID);
  const [name, setName] = useState(defaultGridName);
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const isValid =
    trimmedName.length > 0 && trimmedName.length <= CASE_NAME_MAX_LENGTH;

  const handleTypeChange = (newType: StorageCaseType) => {
    setType(newType);
    if (!nameManuallyEdited) {
      setName(
        newType === STORAGE_CASE_TYPE.GRID ? defaultGridName : defaultUnitName,
      );
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameManuallyEdited(true);
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const desc = trimmedDescription.length > 0 ? trimmedDescription : undefined;

    if (type === STORAGE_CASE_TYPE.UNIT) {
      onSubmit({ type: "unit", name: trimmedName, description: desc });
    } else {
      onSubmit({
        type: "grid",
        name: trimmedName,
        description: desc,
        rows: clampGridSize(rows),
        cols: clampGridSize(cols),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-secondary">
          <Trans>タイプ</Trans>
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange(STORAGE_CASE_TYPE.GRID)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === STORAGE_CASE_TYPE.GRID
                ? "border-primary-400 bg-primary-50 text-primary-600"
                : "border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50"
            }`}
          >
            <Trans>引き出し</Trans>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange(STORAGE_CASE_TYPE.UNIT)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === STORAGE_CASE_TYPE.UNIT
                ? "border-primary-400 bg-primary-50 text-primary-600"
                : "border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50"
            }`}
          >
            <Trans>ボックス</Trans>
          </button>
        </div>
      </div>

      <Input
        label={t`ケース名`}
        value={name}
        onChange={handleNameChange}
        placeholder={t`例: 衣装ケース A`}
        maxLength={CASE_NAME_MAX_LENGTH}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="case-description"
          className="text-sm font-medium text-text-secondary"
        >
          <Trans>説明</Trans>
        </label>
        <textarea
          id="case-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t`例: 主にMDD用衣装を仕舞う場所`}
          maxLength={CASE_DESCRIPTION_MAX_LENGTH}
          rows={2}
          className="rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary transition-colors placeholder:text-text-tertiary hover:border-border-strong focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {type === STORAGE_CASE_TYPE.GRID && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t`行数`}
            type="number"
            value={String(rows)}
            onChange={(e) => setRows(clampGridSize(Number(e.target.value)))}
            min={GRID_SIZE_MIN}
            max={GRID_SIZE_MAX}
          />
          <Input
            label={t`列数`}
            type="number"
            value={String(cols)}
            onChange={(e) => setCols(clampGridSize(Number(e.target.value)))}
            min={GRID_SIZE_MIN}
            max={GRID_SIZE_MAX}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          <Trans>キャンセル</Trans>
        </Button>
        <Button type="submit" fullWidth disabled={!isValid}>
          <Trans>作成</Trans>
        </Button>
      </div>
    </form>
  );
};

export default StorageCaseForm;
