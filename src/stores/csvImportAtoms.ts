import { atom } from "jotai";
import type { CsvParsedRow, CsvValidationResult } from "@/types";
import { CSV_IMPORT } from "@/lib/constants";
import { trpcClient } from "@/lib/trpc";
import { refreshGarmentsAtom } from "@/stores/garmentAtoms";

type CsvImportStep = "upload" | "preview" | "importing" | "done";

type ImportProgress = {
  readonly completed: number;
  readonly total: number;
};

type ImportResult = {
  readonly succeeded: number;
  readonly failed: number;
};

export const csvImportStepAtom = atom<CsvImportStep>("upload");

export const csvValidRowsAtom = atom<readonly CsvParsedRow[]>([]);

export const csvValidationResultsAtom = atom<readonly CsvValidationResult[]>(
  [],
);

export const csvImportProgressAtom = atom<ImportProgress>({
  completed: 0,
  total: 0,
});

export const csvImportResultAtom = atom<ImportResult | undefined>(undefined);

export const csvImportErrorAtom = atom<string | undefined>(undefined);

export const resetCsvImportAtom = atom(undefined, (_get, set) => {
  set(csvImportStepAtom, "upload");
  set(csvValidRowsAtom, []);
  set(csvValidationResultsAtom, []);
  set(csvImportProgressAtom, { completed: 0, total: 0 });
  set(csvImportResultAtom, undefined);
  set(csvImportErrorAtom, undefined);
});

const chunkArray = <T>(
  arr: readonly T[],
  size: number,
): ReadonlyArray<readonly T[]> =>
  arr.length === 0
    ? []
    : [arr.slice(0, size), ...chunkArray(arr.slice(size), size)];

export const executeCsvImportAtom = atom(undefined, async (get, set) => {
  const validRows = get(csvValidRowsAtom);
  const chunks = chunkArray(validRows, CSV_IMPORT.CHUNK_SIZE);
  const { length: totalChunks } = chunks;

  set(csvImportStepAtom, "importing");
  set(csvImportProgressAtom, { completed: 0, total: totalChunks });
  set(csvImportErrorAtom, undefined);

  const results = await chunks.reduce(
    async (
      accPromise: Promise<{
        readonly succeeded: number;
        readonly failed: number;
      }>,
      chunk,
      index,
    ) => {
      const acc = await accPromise;
      const result = await trpcClient.garment.bulkCreate
        .mutate({
          items: chunk.map((row) => ({
            name: row.name,
            category: row.category,
            dollSizes: [row.dollSize],
            colors: [...row.colors],
            tags: [...row.tags],
            brand: row.brand === "" ? undefined : row.brand,
            confidenceDecayDays: row.confidenceDecayDays,
          })),
        })
        .catch(() => undefined);

      set(csvImportProgressAtom, {
        completed: index + 1,
        total: totalChunks,
      });

      return result === undefined
        ? {
            succeeded: acc.succeeded,
            failed: acc.failed + chunk.length,
          }
        : {
            succeeded: acc.succeeded + chunk.length,
            failed: acc.failed,
          };
    },
    Promise.resolve({ succeeded: 0, failed: 0 }),
  );

  set(csvImportResultAtom, results);
  set(csvImportStepAtom, "done");
  set(refreshGarmentsAtom);
});
