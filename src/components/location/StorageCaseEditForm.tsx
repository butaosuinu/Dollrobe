"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { CASE_NAME_MAX_LENGTH } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Props = {
  readonly currentName: string;
  readonly onSubmit: (name: string) => void;
  readonly onCancel: () => void;
};

const StorageCaseEditForm = ({ currentName, onSubmit, onCancel }: Props) => {
  const [name, setName] = useState(currentName);

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length > 0 && trimmedName.length <= CASE_NAME_MAX_LENGTH;

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(trimmedName);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={t`ケース名`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={CASE_NAME_MAX_LENGTH}
        required
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          <Trans>キャンセル</Trans>
        </Button>
        <Button type="submit" fullWidth disabled={!isValid}>
          <Trans>保存</Trans>
        </Button>
      </div>
    </form>
  );
};

export default StorageCaseEditForm;
