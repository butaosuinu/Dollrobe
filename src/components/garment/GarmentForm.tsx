"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createId } from "@paralleldrive/cuid2";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { addGarmentAtom } from "@/stores/garmentAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import type { DollSize, GarmentCategory } from "@/types";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  GARMENT_STATUS,
  CONFIDENCE_DECAY_OPTIONS,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
} from "@/lib/constants";
import { isGarmentCategory, isDollSize } from "@/lib/typeGuards";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import TagInput from "@/components/ui/TagInput";
import ColorPicker from "@/components/ui/ColorPicker";

const GarmentForm = () => {
  const { i18n } = useLingui();
  const router = useRouter();

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
  const addGarment = useSetAtom(addGarmentAtom);
  const authState = useAtomValue(authSessionAtom);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("tops");
  const [dollSize, setDollSize] = useState<DollSize>("1/3");
  const [colors, setColors] = useState<readonly string[]>([]);
  const [tags, setTags] = useState<readonly string[]>([]);
  const [decayDays, setDecayDays] = useState(DEFAULT_CONFIDENCE_DECAY_DAYS);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined,
  );
  const previousImageUrlRef = useRef<string | undefined>(undefined);

  useEffect(
    () => () => {
      if (previousImageUrlRef.current !== undefined) {
        URL.revokeObjectURL(previousImageUrlRef.current);
      }
    },
    [],
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    if (previousImageUrlRef.current !== undefined) {
      URL.revokeObjectURL(previousImageUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    previousImageUrlRef.current = url;
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;

    const now = Date.now();
    await addGarment({
      id: createId(),
      userId: authState.user?.id ?? "local",
      name: name.trim(),
      category,
      dollSize,
      colors: [...colors],
      tags: [...tags],
      imageUrl: imagePreview,
      locationId: undefined,
      status: GARMENT_STATUS.STORED,
      lastScannedAt: now,
      confidenceDecayDays: decayDays,
      checkedOutAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
    router.push("/garments");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border-strong bg-surface-raised transition-colors hover:border-primary-300 hover:bg-primary-50/50">
        {imagePreview !== undefined ? (
          <img
            src={imagePreview}
            alt={t`プレビュー`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <Camera className="size-8" />
            <span className="text-sm">
              <Trans>写真を追加</Trans>
            </span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleImageChange}
        />
      </label>

      <Input
        label={t`名前`}
        placeholder={t`ドール服の名前`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Select
        label={t`カテゴリ`}
        options={categoryOptions}
        value={category}
        onChange={(e) => {
          if (isGarmentCategory(e.target.value)) {
            setCategory(e.target.value);
          }
        }}
      />

      <Select
        label={t`ドールサイズ`}
        options={sizeOptions}
        value={dollSize}
        onChange={(e) => {
          if (isDollSize(e.target.value)) {
            setDollSize(e.target.value);
          }
        }}
      />

      <ColorPicker label={t`色`} colors={colors} onChangeColors={setColors} />

      <TagInput label={t`タグ`} tags={tags} onChangeTags={setTags} />

      <Select
        label={t`信頼度の減衰期間`}
        options={decayOptions}
        value={String(decayDays)}
        onChange={(e) => setDecayDays(Number(e.target.value))}
      />

      <Button type="submit" fullWidth size="lg" disabled={name.trim() === ""}>
        <Trans>登録する</Trans>
      </Button>
    </form>
  );
};

export default GarmentForm;
