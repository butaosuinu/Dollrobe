import { extractColorsCore } from "./extract-colors-core";
import type {
  ExtractColorsRequest,
  ExtractColorsResponse,
} from "./extract-colors-types";

self.addEventListener(
  "message",
  (event: MessageEvent<ExtractColorsRequest>) => {
    const { data } = event;

    const run = async (): Promise<void> => {
      const result = await extractColorsCore({ file: data.file }).catch(
        (error: unknown) => {
          const response: ExtractColorsResponse = {
            type: "error",
            message: error instanceof Error ? error.message : String(error),
          };
          self.postMessage(response);
          return undefined;
        },
      );
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
