"use client";

import { useCallback } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { BulkCaptureMetadata } from "@/types";
import { isGarmentCategory, isDollSize } from "@/lib/typeGuards";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  CONFIDENCE_DECAY_OPTIONS,
} from "@/lib/i18n-labels";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import ColorPicker from "@/components/ui/ColorPicker";

type Props = {
  readonly values: BulkCaptureMetadata;
  readonly onChange: (values: BulkCaptureMetadata) => void;
};

const BulkMetadataFormFields = ({ values, onChange }: Props) => {
  const { i18n } = useLingui();

  const categoryOptions = Object.entries(GARMENT_CATEGORY_LABEL).map(
    ([value, label]) => ({ value, label: i18n._(label) }),
  );
  const sizeOptions = Object.entries(DOLL_SIZE_LABEL).map(([value, label]) => ({
    value,
    label: i18n._(label),
  }));
  const decayOptions = CONFIDENCE_DECAY_OPTIONS.map(({ value, label }) => ({
    value: String(value),
    label: i18n._(label),
  }));

  const update = useCallback(
    (partial: Partial<BulkCaptureMetadata>) => {
      onChange({ ...values, ...partial });
    },
    [values, onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t`名前`}
        placeholder={t`ドール服の名前`}
        value={values.name}
        onChange={(e) => update({ name: e.target.value })}
        required
      />

      <Select
        label={t`カテゴリ`}
        options={categoryOptions}
        value={values.category}
        onChange={(e) => {
          if (isGarmentCategory(e.target.value)) {
            update({ category: e.target.value });
          }
        }}
      />

      <Select
        label={t`ドールサイズ`}
        options={sizeOptions}
        value={values.dollSize}
        onChange={(e) => {
          if (isDollSize(e.target.value)) {
            update({ dollSize: e.target.value });
          }
        }}
      />

      <Input
        label={t`ブランド/メーカー`}
        placeholder={t`ボークス、アゾン等`}
        value={values.brand}
        onChange={(e) => update({ brand: e.target.value })}
      />

      <ColorPicker
        label={t`色`}
        colors={values.colors}
        onChangeColors={(colors) => update({ colors })}
      />

      <TagInput
        label={t`タグ`}
        tags={values.tags}
        onChangeTags={(tags) => update({ tags })}
      />

      <Select
        label={t`信頼度の減衰期間`}
        options={decayOptions}
        value={String(values.confidenceDecayDays)}
        onChange={(e) =>
          update({ confidenceDecayDays: Number(e.target.value) })
        }
      />
    </div>
  );
};

export default BulkMetadataFormFields;
