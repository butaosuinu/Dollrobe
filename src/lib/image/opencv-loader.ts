import type cv from "@techstark/opencv-js";

export type OpenCV = typeof cv;

export const loadOpencv = async (): Promise<OpenCV | undefined> => {
  const m = await import("@techstark/opencv-js").catch(() => undefined);
  return m?.default;
};
