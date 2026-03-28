"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { StorageLocation } from "@/types";
import {
  LOCATION_CUSTOM_NAME_MAX_LENGTH,
  LOCATION_DESCRIPTION_MAX_LENGTH,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Props = {
  readonly location: StorageLocation;
  readonly onSubmit: (input: {
    readonly customName: string | undefined;
    readonly description: string | undefined;
  }) => void;
  readonly onCancel: () => void;
};

const StorageLocationEditForm = ({ location, onSubmit, onCancel }: Props) => {
  const [customName, setCustomName] = useState(location.customName ?? "");
  const [description, setDescription] = useState(location.description ?? "");

  const trimmedCustomName = customName.trim();
  const trimmedDescription = description.trim();

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onSubmit({
      customName: trimmedCustomName.length > 0 ? trimmedCustomName : undefined,
      description:
        trimmedDescription.length > 0 ? trimmedDescription : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-text-tertiary">
        <Trans>ラベル: {location.label}</Trans>
      </p>

      <Input
        label={t`カスタム名称`}
        value={customName}
        onChange={(e) => setCustomName(e.target.value)}
        placeholder={t`例: ワンピース用`}
        maxLength={LOCATION_CUSTOM_NAME_MAX_LENGTH}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="location-description"
          className="text-sm font-medium text-text-secondary"
        >
          <Trans>説明</Trans>
        </label>
        <textarea
          id="location-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t`例: 春物のワンピースを収納`}
          maxLength={LOCATION_DESCRIPTION_MAX_LENGTH}
          rows={2}
          className="rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary transition-colors placeholder:text-text-tertiary hover:border-border-strong focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          <Trans>キャンセル</Trans>
        </Button>
        <Button type="submit" fullWidth>
          <Trans>保存</Trans>
        </Button>
      </div>
    </form>
  );
};

export default StorageLocationEditForm;
