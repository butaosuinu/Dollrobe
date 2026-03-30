import { useState, useCallback } from "react";
import { extractColorsFromFile } from "@/lib/image/extract-colors";
import type { ColorExtractionResult } from "@/lib/image/extract-colors";

export type ColorExtractionState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "done"; readonly colors: readonly string[] }
  | { readonly status: "error" };

export const useColorExtraction = () => {
  const [extractionState, setExtractionState] = useState<ColorExtractionState>({
    status: "idle",
  });

  const extractColors = useCallback(
    async ({
      file,
    }: {
      readonly file: File;
    }): Promise<ColorExtractionResult> => {
      setExtractionState({ status: "loading" });

      const result = await extractColorsFromFile({ file }).catch(
        () => undefined,
      );

      if (result === undefined) {
        setExtractionState({ status: "error" });
        return { presetColors: [] };
      }

      setExtractionState({ status: "done", colors: result.presetColors });
      return result;
    },
    [],
  );

  const reset = useCallback(() => {
    setExtractionState({ status: "idle" });
  }, []);

  return { extractionState, extractColors, reset } as const;
};
