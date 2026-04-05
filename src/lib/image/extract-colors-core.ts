import { COLOR_EXTRACTION } from "@/lib/constants";
import { opencvHsvToHsl, filterToMainColors } from "@/lib/color/color-utils";
import type { ColorCluster } from "@/lib/color/color-utils";
import type { OpenCV } from "./opencv-loader";
import type { ColorExtractionResult } from "./extract-colors-types";

type MatLike = { readonly delete: () => void };

const calculateAnalysisDimensions = ({
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

const getImageData = async ({
  file,
}: {
  readonly file: File;
}): Promise<ImageData> => {
  const bitmap = await createImageBitmap(file);
  const { width, height } = calculateAnalysisDimensions({
    width: bitmap.width,
    height: bitmap.height,
    maxDimension: COLOR_EXTRACTION.ANALYSIS_MAX_DIMENSION,
  });

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    bitmap.close();
    throw new Error("Failed to get OffscreenCanvas 2d context");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return ctx.getImageData(0, 0, width, height);
};

const withMats = async <T>(
  fn: (register: (mat: MatLike) => void) => T,
): Promise<T> => {
  const mats: MatLike[] = [];
  const register = (mat: MatLike): void => {
    mats.push(mat);
  };
  const cleanup = (): void => {
    mats.forEach((mat) => {
      mat.delete();
    });
  };

  const result = await new Promise<T>((resolve) => {
    resolve(fn(register));
  }).catch((error: unknown) => {
    cleanup();
    throw error instanceof Error ? error : new Error(String(error));
  });

  cleanup();
  return result;
};

const runKmeans = async ({
  cv,
  imageData,
}: {
  readonly cv: OpenCV;
  readonly imageData: ImageData;
}): Promise<readonly ColorCluster[]> =>
  await withMats((register) => {
    const colorRgba2Rgb: number = cv.COLOR_RGBA2RGB;
    const colorRgb2Hsv: number = cv.COLOR_RGB2HSV;
    const cv32f: number = cv.CV_32F;
    const criteriaType: number =
      Number(cv.TermCriteria_EPS) + Number(cv.TermCriteria_MAX_ITER);
    const { KMEANS_PP_CENTERS: kmeansFlags } = COLOR_EXTRACTION;

    const src = cv.matFromImageData(imageData);
    register(src);

    const rgb = new cv.Mat();
    register(rgb);
    cv.cvtColor(src, rgb, colorRgba2Rgb);

    const hsv = new cv.Mat();
    register(hsv);
    cv.cvtColor(rgb, hsv, colorRgb2Hsv);

    const totalPixels = hsv.rows * hsv.cols;
    const { data: hsvBytes } = hsv;

    const pixelIndices = Array.from({ length: totalPixels }, (_, i) => i);
    const chromaticIndices = pixelIndices.filter((i) => {
      const sVal = hsvBytes[i * 3 + 1] ?? 0;
      const vVal = hsvBytes[i * 3 + 2] ?? 0;
      if (vVal < COLOR_EXTRACTION.ACHROMATIC_DARK_THRESHOLD) return false;
      return !(
        sVal < COLOR_EXTRACTION.ACHROMATIC_SAT_THRESHOLD &&
        vVal > COLOR_EXTRACTION.ACHROMATIC_VALUE_THRESHOLD
      );
    });

    const useChromaticFilter =
      chromaticIndices.length / totalPixels >=
      COLOR_EXTRACTION.MIN_FILTERED_RATIO;
    const sampleCount = useChromaticFilter
      ? chromaticIndices.length
      : totalPixels;

    const samples = new cv.Mat(sampleCount, 3, cv.CV_8UC1);
    register(samples);

    if (useChromaticFilter) {
      chromaticIndices.forEach((pixelIdx, sampleIdx) => {
        const srcOffset = pixelIdx * 3;
        const dstOffset = sampleIdx * 3;
        samples.data[dstOffset] = hsvBytes[srcOffset] ?? 0;
        samples.data[dstOffset + 1] = hsvBytes[srcOffset + 1] ?? 0;
        samples.data[dstOffset + 2] = hsvBytes[srcOffset + 2] ?? 0;
      });
    } else {
      samples.data.set(hsvBytes.subarray(0, totalPixels * 3));
    }

    const float32Samples = new cv.Mat();
    register(float32Samples);
    samples.convertTo(float32Samples, cv32f);

    const labels = new cv.Mat();
    register(labels);

    const centers = new cv.Mat();
    register(centers);

    const criteria = new cv.TermCriteria(
      criteriaType,
      COLOR_EXTRACTION.KMEANS_MAX_ITERATIONS,
      COLOR_EXTRACTION.KMEANS_EPSILON,
    );

    cv.kmeans(
      float32Samples,
      COLOR_EXTRACTION.KMEANS_K,
      labels,
      criteria,
      COLOR_EXTRACTION.KMEANS_ATTEMPTS,
      kmeansFlags,
      centers,
    );

    const { data32S } = labels;
    const labelsArray = Array.from(
      { length: sampleCount },
      (_, i) => data32S[i],
    );
    const clusterCounts = Array.from(
      { length: COLOR_EXTRACTION.KMEANS_K },
      (_, k) => labelsArray.filter((label) => label === k).length,
    );

    const clusters = Array.from(
      { length: COLOR_EXTRACTION.KMEANS_K },
      (_, i) => ({
        hsl: opencvHsvToHsl({
          h: Math.round(centers.floatAt(i, 0)),
          s: Math.round(centers.floatAt(i, 1)),
          v: Math.round(centers.floatAt(i, 2)),
        }),
        ratio: (clusterCounts[i] ?? 0) / sampleCount,
      }),
    );

    return clusters
      .filter((c) => c.ratio >= COLOR_EXTRACTION.MIN_CLUSTER_RATIO)
      .sort((a, b) => b.ratio - a.ratio);
  });

export const extractColorsCore = async ({
  file,
  cv,
}: {
  readonly file: File;
  readonly cv: OpenCV;
}): Promise<ColorExtractionResult> => {
  const imageData = await getImageData({ file });
  const clusters = await runKmeans({ cv, imageData });
  const presetColors = filterToMainColors({
    clusters,
    secondaryMinRatio: COLOR_EXTRACTION.SECONDARY_COLOR_MIN_RATIO,
  });

  return { presetColors };
};
