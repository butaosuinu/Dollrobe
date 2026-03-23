"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  QR_SCHEME,
  NFC_SCAN_COOLDOWN_MS,
  VIBRATION_DURATION_MS,
} from "@/lib/constants";

export type NfcReaderState =
  | { readonly status: "idle" }
  | { readonly status: "scanning" }
  | { readonly status: "unsupported" }
  | { readonly status: "permission_denied" }
  | { readonly status: "error"; readonly message: string };

type UseNfcReaderCallbacks = {
  readonly onScan: (data: string) => void;
};

type UseNfcReaderParams = UseNfcReaderCallbacks & {
  readonly isActive: boolean;
};

type UseNfcReaderReturn = {
  readonly nfcState: NfcReaderState;
};

const ERROR_VIBRATION_PATTERN = [50, 100, 50];

const isDwgScheme = (value: string): boolean =>
  value.startsWith(QR_SCHEME.GARMENT_PREFIX) ||
  value.startsWith(QR_SCHEME.LOCATION_PREFIX);

const decodeRecord = (record: NDEFRecord): string | undefined => {
  if (record.data === undefined) return undefined;

  if (record.recordType === "url") {
    const decoder = new TextDecoder();
    const url = decoder.decode(record.data);
    return isDwgScheme(url) ? url : undefined;
  }

  if (record.recordType === "text") {
    const decoder = new TextDecoder(record.encoding);
    const text = decoder.decode(record.data);
    return isDwgScheme(text) ? text : undefined;
  }

  return undefined;
};

const extractNfcData = (event: NDEFReadingEvent): string | undefined => {
  const results = event.message.records.map(decodeRecord);
  return results.find((r) => r !== undefined);
};

export const useNfcReader = ({
  onScan,
  isActive,
}: UseNfcReaderParams): UseNfcReaderReturn => {
  const [nfcState, setNfcState] = useState<NfcReaderState>({ status: "idle" });
  const lastScannedRef = useRef<
    { readonly data: string; readonly timestamp: number } | undefined
  >(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  const handleReading = useCallback(
    (event: NDEFReadingEvent) => {
      const data = extractNfcData(event);
      if (data === undefined) return;

      const now = Date.now();
      const isDuplicate =
        lastScannedRef.current?.data === data &&
        now - lastScannedRef.current.timestamp < NFC_SCAN_COOLDOWN_MS;
      if (isDuplicate) return;

      lastScannedRef.current = { data, timestamp: now };
      onScan(data);
      navigator.vibrate(VIBRATION_DURATION_MS);
    },
    [onScan],
  );

  const handleReadingError = useCallback(() => {
    navigator.vibrate(ERROR_VIBRATION_PATTERN);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setNfcState({ status: "idle" });
      return;
    }

    if (typeof window === "undefined" || window.NDEFReader === undefined) {
      setNfcState({ status: "unsupported" });
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startScan = async () => {
      const { NDEFReader: ReaderClass } = window;
      if (ReaderClass === undefined) return;

      const reader = new ReaderClass();
      reader.addEventListener("reading", handleReading);
      reader.addEventListener("readingerror", handleReadingError);

      const error = await reader
        .scan({ signal: abortController.signal })
        .catch((e: unknown) => e);

      if (error !== undefined) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          setNfcState({ status: "permission_denied" });
          return;
        }
        setNfcState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "NFC読み取りに失敗しました",
        });
        return;
      }

      if (!abortController.signal.aborted) {
        setNfcState({ status: "scanning" });
      }
    };

    void startScan();

    return () => {
      abortController.abort();
      abortControllerRef.current = undefined;
    };
  }, [isActive, handleReading, handleReadingError]);

  return { nfcState };
};
