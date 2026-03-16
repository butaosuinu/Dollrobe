"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  CASE_NAME_MAX_LENGTH,
  GRID_SIZE_MIN,
  GRID_SIZE_MAX,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Props = {
  readonly onSubmit: (input: {
    readonly name: string;
    readonly rows: number;
    readonly cols: number;
  }) => void;
  readonly onCancel: () => void;
};

const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 3;

const clampGridSize = (value: number): number =>
  Math.max(GRID_SIZE_MIN, Math.min(GRID_SIZE_MAX, value));

const StorageCaseForm = ({ onSubmit, onCancel }: Props) => {
  const [name, setName] = useState("");
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length > 0 && trimmedName.length <= CASE_NAME_MAX_LENGTH;

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      name: trimmedName,
      rows: clampGridSize(rows),
      cols: clampGridSize(cols),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={t`ケース名`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t`例: 衣装ケース A`}
        maxLength={CASE_NAME_MAX_LENGTH}
        required
      />
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
