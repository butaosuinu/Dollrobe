"use client";

import { X } from "lucide-react";
import type { BulkCaptureItem } from "@/types";

type Props = {
  readonly items: readonly BulkCaptureItem[];
  readonly onRemove: (captureId: string) => void;
};

const CapturedThumbnailStrip = ({ items, onRemove }: Props) => (
  <div className="flex gap-2 overflow-x-auto py-2">
    {items.map((item) => (
      <div key={item.captureId} className="relative shrink-0">
        <img
          src={item.thumbnailUrl}
          alt=""
          className="size-16 rounded-lg object-cover"
        />
        <button
          type="button"
          onClick={() => onRemove(item.captureId)}
          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-danger text-text-inverse shadow"
        >
          <X className="size-3" />
        </button>
      </div>
    ))}
  </div>
);

export default CapturedThumbnailStrip;
