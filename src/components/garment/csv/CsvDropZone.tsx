"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Download } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import clsx from "clsx";
import { generateSampleCsv } from "@/lib/csv/validateCsvRow";

type Props = {
  readonly onFileLoaded: (text: string) => void;
};

const downloadSampleCsv = () => {
  const blob = new Blob([generateSampleCsv()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-garments.csv";
  a.click();
  URL.revokeObjectURL(url);
};

const CsvDropZone = ({ onFileLoaded }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(undefined);

      const isCsv =
        file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
      setError(isCsv ? undefined : "CSVファイルを選択してください");

      if (isCsv) {
        file.text().then(
          (text) => onFileLoaded(text),
          () => setError("ファイルの読み込みに失敗しました"),
        );
      }
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file !== undefined) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file !== undefined) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary-400 bg-primary-50"
            : "border-border-default hover:border-primary-300 hover:bg-surface-overlay",
        )}
      >
        <div
          className={clsx(
            "flex size-12 items-center justify-center rounded-full",
            isDragging ? "bg-primary-100" : "bg-surface-overlay",
          )}
        >
          {isDragging ? (
            <FileText className="size-6 text-primary-500" />
          ) : (
            <Upload className="size-6 text-text-tertiary" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">
            <Trans>CSVファイルをドラッグ&ドロップ</Trans>
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            <Trans>またはクリックしてファイルを選択</Trans>
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error !== undefined && (
        <p className="text-center text-sm text-danger">{error}</p>
      )}

      <button
        type="button"
        onClick={downloadSampleCsv}
        className="flex items-center justify-center gap-2 text-sm text-primary-500 hover:text-primary-600"
      >
        <Download className="size-4" />
        <Trans>サンプルCSVをダウンロード</Trans>
      </button>
    </div>
  );
};

export default CsvDropZone;
