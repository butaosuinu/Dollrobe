import {
  IMAGE_COMPRESSION,
  IMAGE_UPLOAD,
  MIME_TO_EXTENSION,
} from "@/lib/constants";

type CompressImageResult = {
  readonly file: File;
  readonly width: number;
  readonly height: number;
};

const calculateDimensions = ({
  width,
  height,
  maxDimension,
}: {
  readonly width: number;
  readonly height: number;
  readonly maxDimension: number;
}): { readonly width: number; readonly height: number } => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const supportsWebP = (): boolean => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const dataUrl = canvas.toDataURL("image/webp");
  return dataUrl.startsWith("data:image/webp");
};

const canvasToBlob = async ({
  canvas,
  format,
  quality,
}: {
  readonly canvas: HTMLCanvasElement;
  readonly format: string;
  readonly quality: number;
}): Promise<Blob> =>
  await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        resolve(blob);
      },
      format,
      quality,
    );
  });

const needsCompression = ({
  width,
  height,
  fileSize,
  maxDimension,
}: {
  readonly width: number;
  readonly height: number;
  readonly fileSize: number;
  readonly maxDimension: number;
}): boolean =>
  width > maxDimension ||
  height > maxDimension ||
  fileSize > IMAGE_UPLOAD.MAX_UPLOAD_SIZE_BYTES;

export const compressImage = async ({
  file,
  maxDimension = IMAGE_COMPRESSION.MAX_DIMENSION,
  quality = IMAGE_COMPRESSION.OUTPUT_QUALITY,
}: {
  readonly file: File;
  readonly maxDimension?: number;
  readonly quality?: number;
}): Promise<CompressImageResult> => {
  const bitmap = await createImageBitmap(file);
  const { width: originalWidth, height: originalHeight } = bitmap;

  if (
    !needsCompression({
      width: originalWidth,
      height: originalHeight,
      fileSize: file.size,
      maxDimension,
    })
  ) {
    bitmap.close();
    return { file, width: originalWidth, height: originalHeight };
  }

  const { width, height } = calculateDimensions({
    width: originalWidth,
    height: originalHeight,
    maxDimension,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    bitmap.close();
    throw new Error("Failed to get canvas 2d context");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webpSupported = supportsWebP();
  const outputFormat = webpSupported
    ? IMAGE_COMPRESSION.OUTPUT_FORMAT
    : IMAGE_COMPRESSION.FALLBACK_FORMAT;
  const extension = webpSupported
    ? MIME_TO_EXTENSION["image/webp"]
    : MIME_TO_EXTENSION["image/jpeg"];

  const blob = await canvasToBlob({ canvas, format: outputFormat, quality });

  const compressedFile = new File([blob], `compressed.${extension}`, {
    type: outputFormat,
  });

  return { file: compressedFile, width, height };
};
