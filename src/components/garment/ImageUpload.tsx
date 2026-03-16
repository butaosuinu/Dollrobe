"use client";

import { Camera, Loader2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { IMAGE_UPLOAD } from "@/lib/constants";
import type { UploadState } from "@/hooks/useImageUpload";

type Props = {
  readonly imagePreview: string | undefined;
  readonly uploadState: UploadState;
  readonly onFileSelect: (file: File) => void;
};

const ACCEPT_STRING = IMAGE_UPLOAD.ALLOWED_MIME_TYPES.join(",");

const ProgressOverlay = ({
  uploadState,
}: {
  readonly uploadState: UploadState;
}) => {
  if (uploadState.status === "compressing") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="size-8 animate-spin" />
          <span className="text-sm">
            <Trans>圧縮中...</Trans>
          </span>
        </div>
      </div>
    );
  }

  if (uploadState.status === "uploading") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="size-8 animate-spin" />
          <span className="text-sm">
            {Math.round(uploadState.progress * 100)}%
          </span>
        </div>
      </div>
    );
  }

  return undefined;
};

const ImageUpload = ({ imagePreview, uploadState, onFileSelect }: Props) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    onFileSelect(file);
  };

  const isProcessing =
    uploadState.status === "compressing" || uploadState.status === "uploading";

  return (
    <div className="flex flex-col gap-2">
      <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border-strong bg-surface-raised transition-colors hover:border-primary-300 hover:bg-primary-50/50">
        {imagePreview !== undefined ? (
          <div className="relative size-full">
            <img
              src={imagePreview}
              alt={t`プレビュー`}
              className="size-full object-cover"
            />
            <ProgressOverlay uploadState={uploadState} />
          </div>
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
          accept={ACCEPT_STRING}
          capture="environment"
          className="sr-only"
          onChange={handleChange}
          disabled={isProcessing}
        />
      </label>
      {uploadState.status === "error" && (
        <p className="text-sm text-red-500">{uploadState.message}</p>
      )}
    </div>
  );
};

export default ImageUpload;
