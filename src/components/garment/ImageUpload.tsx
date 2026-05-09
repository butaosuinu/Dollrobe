"use client";

import { useRef } from "react";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { UploadState } from "@/hooks/useImageUpload";
import { IMAGE_UPLOAD } from "@/lib/constants";

type Props = {
  readonly imagePreview: string | undefined;
  readonly uploadState: UploadState;
  readonly onFileSelect: (file: File) => void;
};

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
            <Trans>アップロード中...</Trans>
          </span>
        </div>
      </div>
    );
  }

  return undefined;
};

const ImageUpload = ({ imagePreview, uploadState, onFileSelect }: Props) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    onFileSelect(file);
  };

  const isProcessing =
    uploadState.status === "compressing" || uploadState.status === "uploading";

  const acceptMimeTypes = IMAGE_UPLOAD.ALLOWED_INPUT_MIME_TYPES.join(",");

  return (
    <div className="flex flex-col gap-2">
      {imagePreview !== undefined ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-border-strong">
          <img
            src={imagePreview}
            alt={t`プレビュー`}
            className="size-full object-cover"
          />
          <ProgressOverlay uploadState={uploadState} />
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface-raised">
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <Camera className="size-8" />
            <span className="text-sm">
              <Trans>写真を追加</Trans>
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-overlay px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary-50 disabled:opacity-50"
        >
          <Camera className="size-4" />
          <Trans>カメラで撮影</Trans>
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => libraryInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-overlay px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary-50 disabled:opacity-50"
        >
          <ImageIcon className="size-4" />
          <Trans>ライブラリから選択</Trans>
        </button>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptMimeTypes}
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        disabled={isProcessing}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept={acceptMimeTypes}
        className="sr-only"
        onChange={handleChange}
        disabled={isProcessing}
      />
      {uploadState.status === "error" && (
        <p className="text-sm text-danger">{uploadState.message}</p>
      )}
    </div>
  );
};

export default ImageUpload;
