"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { addGarmentAtom } from "@/stores/garmentAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import type { DollSize, GarmentCategory } from "@/types";
import { GARMENT_STATUS, DEFAULT_CONFIDENCE_DECAY_DAYS } from "@/lib/constants";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  CONFIDENCE_DECAY_OPTIONS,
} from "@/lib/i18n-labels";
import { isGarmentCategory, isDollSize } from "@/lib/typeGuards";
import { useImageUpload } from "@/hooks/useImageUpload";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import TagInput from "@/components/ui/TagInput";
import ColorPicker from "@/components/ui/ColorPicker";
import ImageUpload from "@/components/garment/ImageUpload";

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
  const { uploadState, upload, reset: resetUpload } = useImageUpload();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("tops");
  const [dollSize, setDollSize] = useState<DollSize>("SD");
  const [colors, setColors] = useState<readonly string[]>([]);
  const [tags, setTags] = useState<readonly string[]>([]);
  const [brand, setBrand] = useState("");
  const [decayDays, setDecayDays] = useState(DEFAULT_CONFIDENCE_DECAY_DAYS);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined,
  );
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const previousImageUrlRef = useRef<string | undefined>(undefined);

  useEffect(
    () => () => {
      if (previousImageUrlRef.current !== undefined) {
        URL.revokeObjectURL(previousImageUrlRef.current);
      }
    },
    [],
  );

  const handleFileSelect = (file: File) => {
    if (previousImageUrlRef.current !== undefined) {
      URL.revokeObjectURL(previousImageUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    previousImageUrlRef.current = url;
    setImagePreview(url);
    setSelectedFile(file);
    resetUpload();
  };

  const isProcessing =
    uploadState.status === "compressing" || uploadState.status === "uploading";

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (name.trim() === "" || isProcessing) return;

    const garmentId = createId();
    const now = Date.now();

    const imageUrl =
      selectedFile !== undefined
        ? await upload({ file: selectedFile, garmentId }).catch(() => undefined)
        : undefined;

    await addGarment({
      id: garmentId,
      userId: authState.user?.id ?? "local",
      name: name.trim(),
      category,
      dollSize,
      colors: [...colors],
      tags: [...tags],
      imageUrl,
      brand: brand.trim() === "" ? undefined : brand.trim(),
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
      <ImageUpload
        imagePreview={imagePreview}
        uploadState={uploadState}
        onFileSelect={handleFileSelect}
      />

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

      <Input
        label={t`ブランド/メーカー`}
        placeholder={t`ボークス、アゾン等`}
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />

      <ColorPicker label={t`色`} colors={colors} onChangeColors={setColors} />

      <TagInput label={t`タグ`} tags={tags} onChangeTags={setTags} />

      <Select
        label={t`信頼度の減衰期間`}
        options={decayOptions}
        value={String(decayDays)}
        onChange={(e) => setDecayDays(Number(e.target.value))}
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={name.trim() === "" || isProcessing}
      >
        {isProcessing ? (
          <Trans>アップロード中...</Trans>
        ) : (
          <Trans>登録する</Trans>
        )}
      </Button>
    </form>
  );
};

export default GarmentForm;
