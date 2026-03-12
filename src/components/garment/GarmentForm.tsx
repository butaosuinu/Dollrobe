"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createId } from "@paralleldrive/cuid2";
import { addGarmentAtom } from "@/stores/garmentAtoms";
import type { GarmentCategory, DollSize } from "@/types";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  CONFIDENCE_DECAY_OPTIONS,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import TagInput from "@/components/ui/TagInput";
import ColorPicker from "@/components/ui/ColorPicker";

const CATEGORY_OPTIONS = Object.entries(GARMENT_CATEGORY_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const SIZE_OPTIONS = Object.entries(DOLL_SIZE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const DECAY_OPTIONS = CONFIDENCE_DECAY_OPTIONS.map(({ value, label }) => ({
  value: String(value),
  label,
}));

const GarmentForm = () => {
  const router = useRouter();
  const addGarment = useSetAtom(addGarmentAtom);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("tops");
  const [dollSize, setDollSize] = useState<DollSize>("1/3");
  const [colors, setColors] = useState<readonly string[]>([]);
  const [tags, setTags] = useState<readonly string[]>([]);
  const [decayDays, setDecayDays] = useState(DEFAULT_CONFIDENCE_DECAY_DAYS);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;

    const now = Date.now();
    await addGarment({
      id: createId(),
      userId: "local",
      name: name.trim(),
      category,
      dollSize,
      colors: [...colors],
      tags: [...tags],
      imageUrl: undefined,
      locationId: undefined,
      status: "stored",
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
          <img src={imagePreview} alt="プレビュー" className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <Camera className="size-8" />
            <span className="text-sm">写真を追加</span>
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
        label="名前"
        placeholder="ドール服の名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Select
        label="カテゴリ"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(e) => setCategory(e.target.value as GarmentCategory)}
      />

      <Select
        label="ドールサイズ"
        options={SIZE_OPTIONS}
        value={dollSize}
        onChange={(e) => setDollSize(e.target.value as DollSize)}
      />

      <ColorPicker label="色" colors={colors} onChangeColors={setColors} />

      <TagInput label="タグ" tags={tags} onChangeTags={setTags} />

      <Select
        label="信頼度の減衰期間"
        options={DECAY_OPTIONS}
        value={String(decayDays)}
        onChange={(e) => setDecayDays(Number(e.target.value))}
      />

      <Button type="submit" fullWidth size="lg" disabled={name.trim() === ""}>
        登録する
      </Button>
    </form>
  );
};

export default GarmentForm;
