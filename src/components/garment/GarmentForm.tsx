"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { addGarmentAtom, updateGarmentAtom } from "@/stores/garmentAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import type { DollSize, Garment, GarmentCategory } from "@/types";
import {
  GARMENT_STATUS,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
  GARMENT_DESCRIPTION_MAX_LENGTH,
  GARMENT_SET_CONTENTS_MAX_LENGTH,
} from "@/lib/constants";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  CONFIDENCE_DECAY_OPTIONS,
} from "@/lib/i18n-labels";
import { isGarmentCategory, isDollSize } from "@/lib/typeGuards";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useColorExtraction } from "@/hooks/useColorExtraction";
import { preloadColorExtraction } from "@/lib/image/extract-colors";
import { useBrandSuggestions } from "@/hooks/useBrandSuggestions";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import TagInput from "@/components/ui/TagInput";
import ColorPicker from "@/components/ui/ColorPicker";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import Textarea from "@/components/ui/Textarea";
import ImageUpload from "@/components/garment/ImageUpload";

type Props = {
  readonly garment?: Garment;
};

type FormValues = {
  readonly name: string;
  readonly category: GarmentCategory;
  readonly dollSizes: readonly DollSize[];
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly brand: string;
  readonly description: string;
  readonly setContents: string;
  readonly decayDays: number;
  readonly imagePreview: string | undefined;
};

const DEFAULT_FORM_VALUES: FormValues = {
  name: "",
  category: "tops",
  dollSizes: ["SD"],
  colors: [],
  tags: [],
  brand: "",
  description: "",
  setContents: "",
  decayDays: DEFAULT_CONFIDENCE_DECAY_DAYS,
  imagePreview: undefined,
};

const getInitialValues = (garment: Garment | undefined): FormValues => {
  if (garment === undefined) {
    return DEFAULT_FORM_VALUES;
  }
  return {
    name: garment.name,
    category: garment.category,
    dollSizes: garment.dollSizes,
    colors: garment.colors,
    tags: garment.tags,
    brand: garment.brand ?? "",
    description: garment.description ?? "",
    setContents: garment.setContents ?? "",
    decayDays: garment.confidenceDecayDays,
    imagePreview: garment.imageUrl ?? undefined,
  };
};

const GarmentForm = ({ garment }: Props) => {
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
  const brandSuggestions = useBrandSuggestions();
  const addGarment = useSetAtom(addGarmentAtom);
  const updateGarment = useSetAtom(updateGarmentAtom);
  const authState = useAtomValue(authSessionAtom);
  const { uploadState, upload, reset: resetUpload } = useImageUpload();
  const { extractionState, extractColors } = useColorExtraction();
  const initial = getInitialValues(garment);
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<GarmentCategory>(initial.category);
  const [dollSizes, setDollSizes] = useState<readonly DollSize[]>(
    initial.dollSizes,
  );
  const [colors, setColors] = useState<readonly string[]>(initial.colors);
  const [tags, setTags] = useState<readonly string[]>(initial.tags);
  const [brand, setBrand] = useState(initial.brand);
  const [description, setDescription] = useState(initial.description);
  const [setContents, setSetContents] = useState(initial.setContents);
  const [decayDays, setDecayDays] = useState(initial.decayDays);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    initial.imagePreview,
  );
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const previousImageUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    preloadColorExtraction();
  }, []);

  useEffect(
    () => () => {
      if (previousImageUrlRef.current !== undefined) {
        URL.revokeObjectURL(previousImageUrlRef.current);
      }
    },
    [],
  );

  const handleFileSelect = async (file: File) => {
    if (previousImageUrlRef.current !== undefined) {
      URL.revokeObjectURL(previousImageUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    previousImageUrlRef.current = url;
    setImagePreview(url);
    setSelectedFile(file);
    resetUpload();

    if (colors.length === 0) {
      const result = await extractColors({ file }).catch(() => ({
        presetColors: [] as readonly string[],
      }));
      if (result.presetColors.length > 0) {
        setColors((prev) => (prev.length === 0 ? result.presetColors : prev));
      }
    }
  };

  const isProcessing =
    uploadState.status === "compressing" || uploadState.status === "uploading";

  const toggleDollSize = (size: DollSize) => {
    setDollSizes((prev) =>
      prev.includes(size)
        ? prev.length > 1
          ? prev.filter((s) => s !== size)
          : prev
        : [...prev, size],
    );
  };

  const collectFields = () => ({
    name: name.trim(),
    category,
    dollSizes: [...dollSizes],
    colors: [...colors],
    tags: [...tags],
    brand: brand.trim() === "" ? undefined : brand.trim(),
    description: description.trim() === "" ? undefined : description.trim(),
    setContents: setContents.trim() === "" ? undefined : setContents.trim(),
    confidenceDecayDays: decayDays,
  });

  const uploadImage = async (garmentId: string) =>
    selectedFile !== undefined
      ? await upload({ file: selectedFile, garmentId }).catch(
          () => garment?.imageUrl ?? undefined,
        )
      : (garment?.imageUrl ?? undefined);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (name.trim() === "" || isProcessing) return;

    const now = Date.now();
    const fields = collectFields();

    if (garment !== undefined) {
      const imageUrl = await uploadImage(garment.id);
      await updateGarment({
        ...garment,
        ...fields,
        imageUrl,
        updatedAt: now,
      });
      router.push(`/garments/${garment.id}`);
    } else {
      const garmentId = createId();
      const imageUrl = await uploadImage(garmentId);
      await addGarment({
        ...fields,
        id: garmentId,
        userId: authState.user?.id ?? "local",
        imageUrl,
        locationId: undefined,
        status: GARMENT_STATUS.STORED,
        lastScannedAt: now,
        confidenceDecayDaysOverride: undefined,
        recentCheckoutCount: 0,
        checkedOutAt: undefined,
        archivedAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
      router.push("/garments");
    }
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

      <Textarea
        label={t`セット内容`}
        id="garment-set-contents"
        placeholder={t`ブラウス、スカート、リボン等`}
        value={setContents}
        onChange={(e) => setSetContents(e.target.value)}
        maxLength={GARMENT_SET_CONTENTS_MAX_LENGTH}
        rows={2}
      />

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-text-secondary">
          {t`ドールサイズ`}
        </legend>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map(({ value, label }) => {
            const selected = isDollSize(value) && dollSizes.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (isDollSize(value)) {
                    toggleDollSize(value);
                  }
                }}
                className={clsx(
                  "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary-500 bg-primary-500 text-text-inverse"
                    : "border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <AutocompleteInput
        label={t`ブランド/メーカー`}
        placeholder={t`ボークス、アゾン等`}
        value={brand}
        onChangeValue={setBrand}
        suggestions={brandSuggestions}
      />

      <Textarea
        label={t`メモ`}
        id="garment-description"
        placeholder={t`タイトめ、伸縮性あり等`}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={GARMENT_DESCRIPTION_MAX_LENGTH}
        rows={3}
      />

      {extractionState.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="size-4 animate-spin" />
          <span>
            <Trans>色を分析中...</Trans>
          </span>
        </div>
      )}

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
        ) : garment !== undefined ? (
          <Trans>更新する</Trans>
        ) : (
          <Trans>登録する</Trans>
        )}
      </Button>
    </form>
  );
};

export default GarmentForm;
