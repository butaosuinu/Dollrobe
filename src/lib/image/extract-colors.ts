import type {
  ColorExtractionResult,
  ExtractColorsRequest,
  ExtractColorsResponse,
} from "./extract-colors-types";

export type { ColorExtractionResult } from "./extract-colors-types";

const getWorker = (() => {
  const state: { worker: Worker | undefined } = { worker: undefined };
  return (): Worker => {
    state.worker ??= new Worker(
      new URL("./extract-colors.worker.ts", import.meta.url),
    );
    return state.worker;
  };
})();

export const extractColorsFromFile = async ({
  file,
}: {
  readonly file: File;
}): Promise<ColorExtractionResult> =>
  await new Promise<ColorExtractionResult>((resolve, reject) => {
    const worker = getWorker();

    const handleMessage = (
      event: MessageEvent<ExtractColorsResponse>,
    ): void => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);

      const { data } = event;
      if (data.type === "error") {
        reject(new Error(data.message));
        return;
      }
      resolve({ presetColors: data.presetColors });
    };

    const handleError = (event: ErrorEvent): void => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(new Error(event.message));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    const request: ExtractColorsRequest = { type: "extract", file };
    worker.postMessage(request);
  });
