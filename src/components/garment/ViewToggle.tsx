"use client";

import { Grid3X3, List } from "lucide-react";
import clsx from "clsx";

type ViewMode = "grid" | "list";

type Props = {
  readonly mode: ViewMode;
  readonly onChangeMode: (mode: ViewMode) => void;
};

const ViewToggle = ({ mode, onChangeMode }: Props) => (
  <div className="flex overflow-hidden rounded-lg border border-border-default">
    <button
      onClick={() => onChangeMode("grid")}
      className={clsx(
        "flex size-8 items-center justify-center transition-colors",
        mode === "grid"
          ? "bg-primary-100 text-primary-600"
          : "text-text-tertiary hover:bg-primary-50",
      )}
      aria-label="グリッド表示"
      aria-pressed={mode === "grid"}
    >
      <Grid3X3 className="size-4" />
    </button>
    <button
      onClick={() => onChangeMode("list")}
      className={clsx(
        "flex size-8 items-center justify-center border-l border-border-default transition-colors",
        mode === "list"
          ? "bg-primary-100 text-primary-600"
          : "text-text-tertiary hover:bg-primary-50",
      )}
      aria-label="リスト表示"
      aria-pressed={mode === "list"}
    >
      <List className="size-4" />
    </button>
  </div>
);

export default ViewToggle;
