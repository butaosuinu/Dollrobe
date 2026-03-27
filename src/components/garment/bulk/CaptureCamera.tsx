"use client";

import { useEffect, useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import { Camera, ArrowRight } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { BULK_CAPTURE, VIBRATION_DURATION_MS } from "@/lib/constants";
import { useCamera } from "@/hooks/useCamera";
import {
  capturedItemsAtom,
  addCapturedItemAtom,
  removeCapturedItemAtom,
  bulkCaptureStepAtom,
} from "@/stores/bulkCaptureAtoms";
import Button from "@/components/ui/Button";
import CapturedThumbnailStrip from "./CapturedThumbnailStrip";

const CaptureCamera = () => {
  const { videoRef, canvasRef, isActive, error, start, stop, captureFrame } =
    useCamera();
  const items = useAtomValue(capturedItemsAtom);
  const addItem = useSetAtom(addCapturedItemAtom);
  const removeItem = useSetAtom(removeCapturedItemAtom);
  const setStep = useSetAtom(bulkCaptureStepAtom);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const handleCapture = useCallback(() => {
    const blob = captureFrame();
    if (blob !== undefined) {
      const captureId = createId();
      const thumbnailUrl = URL.createObjectURL(blob);
      addItem({
        captureId,
        blob,
        thumbnailUrl,
        capturedAt: Date.now(),
      });
      navigator.vibrate?.(VIBRATION_DURATION_MS);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
    }
  }, [captureFrame, addItem]);

  const canCapture = isActive && items.length < BULK_CAPTURE.MAX_COUNT;
  const canProceed = items.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        {isFlashing && (
          <div className="absolute inset-0 animate-[fade-out_0.15s_ease-out] bg-white" />
        )}
        {error !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="px-4 text-center text-sm text-white">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">
          {items.length}/{BULK_CAPTURE.MAX_COUNT}
        </span>
        <button
          type="button"
          onClick={handleCapture}
          disabled={!canCapture}
          className="flex size-16 items-center justify-center rounded-full border-4 border-primary-500 bg-white transition-all active:scale-90 disabled:opacity-50"
        >
          <Camera className="size-6 text-primary-500" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep("metadata")}
          disabled={!canProceed}
        >
          <Trans>次へ</Trans>
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>

      {items.length > 0 && (
        <CapturedThumbnailStrip items={items} onRemove={removeItem} />
      )}
    </div>
  );
};

export default CaptureCamera;
