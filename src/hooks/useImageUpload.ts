import { useState, useCallback, useRef } from "react";
import { z } from "zod";
import { IMAGE_UPLOAD } from "@/lib/constants";
import { compressImage } from "@/lib/image/compressImage";

export type UploadState =
  | { readonly status: "idle" }
  | { readonly status: "compressing" }
  | { readonly status: "uploading"; readonly progress: number }
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
  const xhrRef = useRef<XMLHttpRequest | undefined>(undefined);

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

      return await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        const formData = new FormData();
        formData.append("file", compressed.file);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = e.loaded / e.total;
            setUploadState({ status: "uploading", progress });
          }
        });

        xhr.addEventListener("load", () => {
          const parsed = parseJsonSafe(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300) {
            const result = uploadResponseSchema.safeParse(parsed);
            if (result.success) {
              setUploadState({
                status: "success",
                imageUrl: result.data.imageUrl,
              });
              resolve(result.data.imageUrl);
              return;
            }
            const message = "不正なレスポンス形式です";
            setUploadState({ status: "error", message });
            reject(new Error(message));
            return;
          }

          const errorResult = errorResponseSchema.safeParse(parsed);
          const message = errorResult.success
            ? errorResult.data.error
            : "アップロードに失敗しました";
          setUploadState({ status: "error", message });
          reject(new Error(message));
        });

        xhr.addEventListener("error", () => {
          const message = "アップロードに失敗しました";
          setUploadState({ status: "error", message });
          reject(new Error(message));
        });

        setUploadState({ status: "uploading", progress: 0 });
        xhr.open("POST", `${WORKERS_URL}/api/images/upload/${garmentId}`);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (xhrRef.current !== undefined) {
      xhrRef.current.abort();
      xhrRef.current = undefined;
    }
    setUploadState({ status: "idle" });
  }, []);

  return { uploadState, upload, reset } as const;
};
