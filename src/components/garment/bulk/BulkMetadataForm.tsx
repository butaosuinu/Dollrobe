"use client";

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import type { BulkCaptureMetadata } from "@/types";
import {
  capturedItemsAtom,
  metadataMapAtom,
  setMetadataAtom,
  currentMetadataIndexAtom,
  bulkCaptureStepAtom,
  executeBulkRegistrationAtom,
  getMetadataForItem,
} from "@/stores/bulkCaptureAtoms";
import Button from "@/components/ui/Button";
import TextButton from "@/components/ui/TextButton";
import BulkMetadataFormFields from "./BulkMetadataFormFields";

const BulkMetadataForm = () => {
  const items = useAtomValue(capturedItemsAtom);
  const metadataMap = useAtomValue(metadataMapAtom);
  const currentIndex = useAtomValue(currentMetadataIndexAtom);
  const setMetadata = useSetAtom(setMetadataAtom);
  const setCurrentIndex = useSetAtom(currentMetadataIndexAtom);
  const setStep = useSetAtom(bulkCaptureStepAtom);
  const executeRegistration = useSetAtom(executeBulkRegistrationAtom);

  const currentItem = items[currentIndex];
  const currentMetadata =
    currentItem !== undefined
      ? getMetadataForItem(metadataMap, currentItem.captureId)
      : undefined;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;
  const allNamed = items.every((item) => {
    const m = metadataMap.get(item.captureId);
    return m !== undefined && m.name.trim() !== "";
  });

  const handleChange = useCallback(
    (values: BulkCaptureMetadata) => {
      setMetadata(values);
    },
    [setMetadata],
  );

  const handleApplyPrevious = useCallback(() => {
    const prevItem = items[currentIndex - 1];
    const prevMeta =
      prevItem !== undefined ? metadataMap.get(prevItem.captureId) : undefined;
    if (currentItem !== undefined && prevMeta !== undefined) {
      setMetadata({
        ...prevMeta,
        captureId: currentItem.captureId,
        name: "",
      });
    }
  }, [items, currentIndex, currentItem, metadataMap, setMetadata]);

  const handleRegister = useCallback(async () => {
    await executeRegistration();
  }, [executeRegistration]);

  return currentItem === undefined || currentMetadata === undefined ? (
    <div />
  ) : (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">
          {currentIndex + 1} / {items.length}
        </span>
        <div className="h-2 flex-1 mx-4 overflow-hidden rounded-full bg-surface-overlay">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{
              width: `${String(Math.round(((currentIndex + 1) / items.length) * 100))}%`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <img
          src={currentItem.thumbnailUrl}
          alt=""
          className="h-48 rounded-xl object-cover"
        />
      </div>

      {!isFirst && (
        <div className="flex justify-center">
          <TextButton onClick={handleApplyPrevious}>
            <Copy className="size-4" />
            <Trans>前の値を適用</Trans>
          </TextButton>
        </div>
      )}

      <BulkMetadataFormFields
        values={currentMetadata}
        onChange={handleChange}
      />

      <div className="flex gap-3">
        {isFirst ? (
          <Button variant="secondary" onClick={() => setStep("capture")}>
            <ArrowLeft className="mr-1 size-4" />
            <Trans>戻る</Trans>
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setCurrentIndex(currentIndex - 1)}
          >
            <ArrowLeft className="mr-1 size-4" />
            <Trans>前へ</Trans>
          </Button>
        )}
        {isLast ? (
          <Button onClick={handleRegister} disabled={!allNamed} fullWidth>
            <Trans>登録開始</Trans>
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)} fullWidth>
            <Trans>次へ</Trans>
            <ArrowRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkMetadataForm;
