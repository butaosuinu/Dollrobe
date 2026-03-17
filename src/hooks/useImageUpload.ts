import { useState, useCallback, useRef } from "react";
import { z } from "zod";
import { IMAGE_UPLOAD } from "@/lib/constants";
import { compressImage } from "@/lib/image/compressImage";

export type UploadState =
  | { readonly status: "idle" }
  | { readonly status: "compressing" }
  | { readonly status: "uploading" }
  | { readonly status: "success"; readonly imageUrl: string }
  | { readonly status: "error"; readonly message: string };

const WORKERS_URL =
  process.env.NEXT_PUBLIC_WORKERS_URL ?? "http://localhost:8787";

const uploadResponseSchema = z.object({ imageUrl: z.string() });
const errorResponseSchema = z.object({ error: z.string() });

const parseJsonSafe = (text: string): unknown => {
  const result = z
    .string()
    .transform((s) => JSON.parse(s) as unknown)
    .safeParse(text);
  return result.success ? result.data : undefined;
};

const isAllowedMimeType = (type: string): boolean =>
  IMAGE_UPLOAD.ALLOWED_MIME_TYPES.some((t) => t === type);

export const useImageUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const upload = useCallback(
    async ({
      file,
      garmentId,
    }: {
      readonly file: File;
      readonly garmentId: string;
    }): Promise<string> => {
      if (!isAllowedMimeType(file.type)) {
        const message = `許可されていないファイル形式です: ${file.type}`;
        setUploadState({ status: "error", message });
        throw new Error(message);
      }

      if (file.size > IMAGE_UPLOAD.MAX_INPUT_SIZE_BYTES) {
        const message = "ファイルサイズが上限 (50MB) を超えています";
        setUploadState({ status: "error", message });
        throw new Error(message);
      }

      setUploadState({ status: "compressing" });

      const compressed = await compressImage({ file });

      setUploadState({ status: "uploading" });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const formData = new FormData();
      formData.append("file", compressed.file);

      const response = await fetch(
        `${WORKERS_URL}/api/images/upload/${garmentId}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          signal: abortController.signal,
        },
      ).catch((error: unknown) => {
        const message = "アップロードに失敗しました";
        setUploadState({ status: "error", message });
        throw error instanceof Error ? error : new Error(message);
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const parsed = parseJsonSafe(text);
        const errorResult = errorResponseSchema.safeParse(parsed);
        const message = errorResult.success
          ? errorResult.data.error
          : "アップロードに失敗しました";
        setUploadState({ status: "error", message });
        throw new Error(message);
      }

      const text = await response.text().catch(() => "");
      const parsed = parseJsonSafe(text);
      const result = uploadResponseSchema.safeParse(parsed);
      if (!result.success) {
        const message = "不正なレスポンス形式です";
        setUploadState({ status: "error", message });
        throw new Error(message);
      }

      setUploadState({ status: "success", imageUrl: result.data.imageUrl });
      return result.data.imageUrl;
    },
    [],
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current !== undefined) {
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
    }
    setUploadState({ status: "idle" });
  }, []);

  return { uploadState, upload, reset } as const;
};
