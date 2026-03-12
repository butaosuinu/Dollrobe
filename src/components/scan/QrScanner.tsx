"use client";

import { useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

type Props = {
  readonly onScan: (data: string) => void;
  readonly isActive: boolean;
};

const SCAN_INTERVAL_MS = 250;
const SCAN_COOLDOWN_MS = 2000;

const QrScanner = ({ onScan, isActive }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const animationRef = useRef<number>(0);
  const lastScannedRef = useRef<
    { readonly data: string; readonly timestamp: number } | undefined
  >(undefined);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      })
      .catch(() => undefined);

    if (stream === undefined) return;

    streamRef.current = stream;
    const video = videoRef.current;
    if (video !== null) {
      video.srcObject = stream;
      await video.play().catch(() => undefined);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    cancelAnimationFrame(animationRef.current);
  }, []);

  const handleDetectedCode = useCallback(
    (data: string) => {
      const now = Date.now();
      const isDuplicate =
        lastScannedRef.current?.data === data &&
        now - lastScannedRef.current.timestamp < SCAN_COOLDOWN_MS;
      if (isDuplicate) return;

      lastScannedRef.current = { data, timestamp: now };
      onScan(data);
      navigator.vibrate?.(100);
    },
    [onScan],
  );

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video === null || canvas === null) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code === null || code.data === "") return;
    handleDetectedCode(code.data);
  }, [handleDetectedCode]);

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      return;
    }

    startCamera();

    const interval = setInterval(scanFrame, SCAN_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera, scanFrame]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="size-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative size-48">
          <span className="absolute left-0 top-0 h-6 w-6 border-l-3 border-t-3 border-primary-400 rounded-tl-lg" />
          <span className="absolute right-0 top-0 h-6 w-6 border-r-3 border-t-3 border-primary-400 rounded-tr-lg" />
          <span className="absolute bottom-0 left-0 h-6 w-6 border-b-3 border-l-3 border-primary-400 rounded-bl-lg" />
          <span className="absolute bottom-0 right-0 h-6 w-6 border-b-3 border-r-3 border-primary-400 rounded-br-lg" />

          <div className="absolute inset-0 animate-[scan-pulse_2s_ease-in-out_infinite] rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
