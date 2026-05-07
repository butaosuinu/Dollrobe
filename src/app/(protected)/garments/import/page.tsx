"use client";

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import type { CsvParsedRow, CsvValidationResult } from "@/types";
import {
  parseCsv,
  hasRequiredHeaders,
  mapRowToRecord,
} from "@/lib/csv/parseCsv";
import { validateCsvRow } from "@/lib/csv/validateCsvRow";
import {
  csvImportStepAtom,
  csvValidRowsAtom,
  csvValidationResultsAtom,
  csvImportProgressAtom,
  csvImportResultAtom,
  resetCsvImportAtom,
  executeCsvImportAtom,
} from "@/stores/csvImportAtoms";
import CsvDropZone from "@/components/garment/csv/CsvDropZone";
import CsvPreviewTable from "@/components/garment/csv/CsvPreviewTable";
import CsvImportProgress from "@/components/garment/csv/CsvImportProgress";
import PageHeader from "@/components/ui/PageHeader";

const STEP_TITLES = Object.freeze({
  upload: "CSVインポート",
  preview: "プレビュー",
  importing: "インポート中",
  done: "完了",
});

const CsvImportPage = () => {
  const step = useAtomValue(csvImportStepAtom);
  const validationResults = useAtomValue(csvValidationResultsAtom);
  const progress = useAtomValue(csvImportProgressAtom);
  const result = useAtomValue(csvImportResultAtom);
  const setStep = useSetAtom(csvImportStepAtom);
  const setValidRows = useSetAtom(csvValidRowsAtom);
  const setValidationResults = useSetAtom(csvValidationResultsAtom);
  const reset = useSetAtom(resetCsvImportAtom);
  const executeImport = useSetAtom(executeCsvImportAtom);

  const handleFileLoaded = useCallback(
    (text: string) => {
      const { headers, rows } = parseCsv(text);
      const headerCheck = hasRequiredHeaders(headers);

      const results: readonly CsvValidationResult[] = headerCheck.valid
        ? rows.map((row, index) =>
            validateCsvRow({
              record: mapRowToRecord({ headers, row }),
              rowNumber: index + 1,
            }),
          )
        : [
            {
              ok: false,
              errors: [
                {
                  row: 0,
                  field: "headers",
                  message: `必須ヘッダーが不足: ${headerCheck.missing.join(", ")}`,
                },
              ],
            },
          ];

      const validRows: readonly CsvParsedRow[] = results.flatMap((r) =>
        r.ok ? [r.data] : [],
      );

      setValidationResults(results);
      setValidRows(validRows);
      setStep("preview");
    },
    [setValidationResults, setValidRows, setStep],
  );

  const handleConfirmImport = useCallback(() => {
    executeImport();
  }, [executeImport]);

  const handleBack = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
      <PageHeader
        title={<Trans>{STEP_TITLES[step]}</Trans>}
        backHref="/garments"
      />

      {step === "upload" && <CsvDropZone onFileLoaded={handleFileLoaded} />}

      {step === "preview" && (
        <CsvPreviewTable
          results={validationResults}
          onConfirm={handleConfirmImport}
          onBack={handleBack}
        />
      )}

      {(step === "importing" || step === "done") && (
        <CsvImportProgress
          progress={progress}
          result={result}
          isDone={step === "done"}
          onReset={handleBack}
        />
      )}
    </div>
  );
};

export default CsvImportPage;
