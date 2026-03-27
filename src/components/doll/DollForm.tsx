"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { addDollAtom, updateDollAtom } from "@/stores/dollAtoms";
import { authSessionAtom } from "@/stores/authAtoms";
import type { Doll, DollSize } from "@/types";
import { DOLL_NAME_MAX_LENGTH, DOLL_MEMO_MAX_LENGTH } from "@/lib/constants";
import { DOLL_SIZE_LABEL } from "@/lib/i18n-labels";
import { isDollSize } from "@/lib/typeGuards";
import { useImageUpload } from "@/hooks/useImageUpload";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ImageUpload from "@/components/garment/ImageUpload";

type Props = {
  readonly doll?: Doll;
};

type FormValues = {
  readonly name: string;
  readonly headModel: string;
  readonly bodySize: DollSize;
  readonly maker: string;
  readonly customizer: string;
  readonly memo: string;
  readonly imagePreview: string | undefined;
};

const DEFAULT_FORM_VALUES: FormValues = {
  name: "",
  headModel: "",
  bodySize: "SD",
  maker: "",
  customizer: "",
  memo: "",
  imagePreview: undefined,
};

const getInitialValues = (doll: Doll | undefined): FormValues => {
  if (doll === undefined) {
    return DEFAULT_FORM_VALUES;
  }
  return {
    name: doll.name,
    headModel: doll.headModel ?? "",
    bodySize: doll.bodySize,
    maker: doll.maker ?? "",
    customizer: doll.customizer ?? "",
    memo: doll.memo ?? "",
    imagePreview: doll.imageUrl ?? undefined,
  };
};

const DollForm = ({ doll }: Props) => {
  const { i18n } = useLingui();
  const router = useRouter();

  const sizeOptions = Object.entries(DOLL_SIZE_LABEL).map(([value, label]) => ({
    value,
    label: i18n._(label),
  }));

  const addDoll = useSetAtom(addDollAtom);
  const updateDoll = useSetAtom(updateDollAtom);
  const authState = useAtomValue(authSessionAtom);
  const { uploadState, upload, reset: resetUpload } = useImageUpload();
  const initial = getInitialValues(doll);
  const [name, setName] = useState(initial.name);
  const [headModel, setHeadModel] = useState(initial.headModel);
  const [bodySize, setBodySize] = useState<DollSize>(initial.bodySize);
  const [maker, setMaker] = useState(initial.maker);
  const [customizer, setCustomizer] = useState(initial.customizer);
  const [memo, setMemo] = useState(initial.memo);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    initial.imagePreview,
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

  const uploadImage = async (dollId: string) =>
    selectedFile !== undefined
      ? await upload({ file: selectedFile, garmentId: dollId }).catch(
          () => doll?.imageUrl ?? undefined,
        )
      : (doll?.imageUrl ?? undefined);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (name.trim() === "" || isProcessing) return;

    const now = Date.now();
    const fields = {
      name: name.trim(),
      headModel: headModel.trim() === "" ? undefined : headModel.trim(),
      bodySize,
      maker: maker.trim() === "" ? undefined : maker.trim(),
      customizer: customizer.trim() === "" ? undefined : customizer.trim(),
      memo: memo.trim() === "" ? undefined : memo.trim(),
    };

    if (doll !== undefined) {
      const imageUrl = await uploadImage(doll.id);
      await updateDoll({
        ...doll,
        ...fields,
        imageUrl,
        updatedAt: now,
      });
      router.push(`/dolls/${doll.id}`);
    } else {
      const dollId = createId();
      const imageUrl = await uploadImage(dollId);
      await addDoll({
        ...fields,
        id: dollId,
        userId: authState.user?.id ?? "local",
        imageUrl,
        createdAt: now,
        updatedAt: now,
      });
      router.push("/dolls");
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
        placeholder={t`ドールの名前`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={DOLL_NAME_MAX_LENGTH}
        required
      />

      <Input
        label={t`ヘッド型番`}
        placeholder={t`DDH-01 等`}
        value={headModel}
        onChange={(e) => setHeadModel(e.target.value)}
      />

      <Input
        label={t`メーカー`}
        placeholder={t`ボークス、アゾン 等`}
        value={maker}
        onChange={(e) => setMaker(e.target.value)}
        maxLength={DOLL_NAME_MAX_LENGTH}
      />

      <Input
        label={t`カスタマイザー`}
        placeholder={t`カスタムメイクの作者名`}
        value={customizer}
        onChange={(e) => setCustomizer(e.target.value)}
        maxLength={DOLL_NAME_MAX_LENGTH}
      />

      <Select
        label={t`ボディサイズ`}
        options={sizeOptions}
        value={bodySize}
        onChange={(e) => {
          if (isDollSize(e.target.value)) {
            setBodySize(e.target.value);
          }
        }}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="doll-memo"
          className="text-sm font-medium text-text-secondary"
        >
          {t`メモ`}
        </label>
        <textarea
          id="doll-memo"
          placeholder={t`自由にメモを入力...`}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={DOLL_MEMO_MAX_LENGTH}
          rows={3}
          className="rounded-lg border border-border-default bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors hover:border-border-strong focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={name.trim() === "" || isProcessing}
      >
        {isProcessing ? (
          <Trans>アップロード中...</Trans>
        ) : doll !== undefined ? (
          <Trans>更新する</Trans>
        ) : (
          <Trans>登録する</Trans>
        )}
      </Button>
    </form>
  );
};

export default DollForm;
