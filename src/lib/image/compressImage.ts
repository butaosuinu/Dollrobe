import { IMAGE_COMPRESSION, IMAGE_UPLOAD } from "@/lib/constants";

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

const canvasToBlob = async ({
  canvas,
  format,
}: {
  readonly canvas: HTMLCanvasElement;
  readonly format: string;
}): Promise<Blob> =>
  await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("Canvas toBlob returned null"));
        return;
      }
      resolve(blob);
    }, format);
  });

const needsConversion = ({
  width,
  height,
  fileSize,
  mimeType,
  maxDimension,
}: {
  readonly width: number;
  readonly height: number;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly maxDimension: number;
}): boolean =>
  mimeType !== IMAGE_COMPRESSION.OUTPUT_FORMAT ||
  width > maxDimension ||
  height > maxDimension ||
  fileSize > IMAGE_UPLOAD.MAX_UPLOAD_SIZE_BYTES;

export const compressImage = async ({
  file,
  maxDimension = IMAGE_COMPRESSION.MAX_DIMENSION,
}: {
  readonly file: File;
  readonly maxDimension?: number;
}): Promise<CompressImageResult> => {
  const bitmap = await createImageBitmap(file);
  const { width: originalWidth, height: originalHeight } = bitmap;

  if (
    !needsConversion({
      width: originalWidth,
      height: originalHeight,
      fileSize: file.size,
      mimeType: file.type,
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

  const blob = await canvasToBlob({
    canvas,
    format: IMAGE_COMPRESSION.OUTPUT_FORMAT,
  });

  const compressedFile = new File([blob], "compressed.png", {
    type: IMAGE_COMPRESSION.OUTPUT_FORMAT,
  });

  return { file: compressedFile, width, height };
};
