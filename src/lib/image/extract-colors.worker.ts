import type { OpenCV } from "./opencv-loader";
import { extractColorsCore } from "./extract-colors-core";
import type {
  ExtractColorsRequest,
  ExtractColorsResponse,
} from "./extract-colors-types";

type WorkerCvState = {
  readonly cv?: OpenCV | Promise<OpenCV>;
};

type WorkerLocation = {
  readonly location: { readonly origin: string };
};

type WorkerImport = {
  readonly importScripts: (...urls: readonly string[]) => void;
};

const workerCv: WorkerCvState = self;
const workerLoc: WorkerLocation = self;
const workerImport: WorkerImport = self;

const resolveCV = async (
  maybeCv: OpenCV | Promise<OpenCV> | undefined,
): Promise<OpenCV | undefined> => {
  if (maybeCv === undefined) {
    return undefined;
  }
  return await Promise.resolve(maybeCv);
};

const loadOpencv = async (): Promise<OpenCV | undefined> => {
  const cached = await resolveCV(workerCv.cv);
  if (cached !== undefined) {
    return cached;
  }
  await new Promise<void>((resolve) => {
    workerImport.importScripts(`${workerLoc.location.origin}/opencv.js`);
    resolve();
  }).catch(() => undefined);
  return await resolveCV(workerCv.cv);
};

const cvPromise = loadOpencv();

self.addEventListener(
  "message",
  (event: MessageEvent<ExtractColorsRequest>) => {
    const { data } = event;

    const run = async (): Promise<void> => {
      const cv = await cvPromise;
      if (cv === undefined) {
        const response: ExtractColorsResponse = {
          type: "error",
          message: "OpenCV.js failed to load",
        };
        self.postMessage(response);
        return;
      }

      const result = await extractColorsCore({
        file: data.file,
        cv,
      }).catch((error: unknown) => {
        const response: ExtractColorsResponse = {
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(response);
        return undefined;
      });
      if (result === undefined) {
        return;
      }
      const response: ExtractColorsResponse = {
        type: "result",
        presetColors: [...result.presetColors],
      };
      self.postMessage(response);
    };

    void run();
  },
);
