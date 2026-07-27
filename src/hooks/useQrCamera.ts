"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyCameraError,
  type CameraErrorKind,
} from "@/lib/camera/cameraError";

export type QrCameraState =
  | { readonly status: "idle" }
  | { readonly status: "starting" }
  | { readonly status: "active" }
  | { readonly status: "error"; readonly kind: CameraErrorKind };

type UseQrCameraParams = {
  readonly isActive: boolean;
};

type UseQrCameraActions = {
  readonly retry: () => void;
};

type UseQrCameraState = {
  readonly videoRef: React.RefObject<HTMLVideoElement | null>;
  readonly cameraState: QrCameraState;
};

type UseQrCameraReturn = UseQrCameraActions & UseQrCameraState;

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "environment",
    width: CAMERA_WIDTH,
    height: CAMERA_HEIGHT,
  },
};

/** 非セキュアコンテキストや旧ブラウザでは `mediaDevices` 自体が存在しない。 */
const getMediaDevices = (): MediaDevices | undefined => navigator.mediaDevices;

export const useQrCamera = ({
  isActive,
}: UseQrCameraParams): UseQrCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [cameraState, setCameraState] = useState<QrCameraState>({
    status: "idle",
  });
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = undefined;
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopCamera();
      setCameraState({ status: "idle" });
      return;
    }

    const abortController = new AbortController();
    const isAborted = () => abortController.signal.aborted;

    const startCamera = async () => {
      setCameraState({ status: "starting" });

      const mediaDevices = getMediaDevices();
      if (typeof mediaDevices?.getUserMedia !== "function") {
        setCameraState({ status: "error", kind: "unsupported" });
        return;
      }

      const result = await mediaDevices
        .getUserMedia(CAMERA_CONSTRAINTS)
        .catch((error: unknown) => ({ cameraError: error }));

      if (isAborted()) {
        if (!("cameraError" in result)) {
          result.getTracks().forEach((track) => {
            track.stop();
          });
        }
        return;
      }

      if ("cameraError" in result) {
        setCameraState({
          status: "error",
          kind: classifyCameraError(result.cameraError),
        });
        return;
      }

      streamRef.current = result;
      const { current: video } = videoRef;
      if (video !== null) {
        video.srcObject = result;
        await video.play().catch(() => undefined);
      }

      if (isAborted()) return;
      setCameraState({ status: "active" });
    };

    void startCamera();

    return () => {
      abortController.abort();
      stopCamera();
    };
  }, [isActive, retryCount, stopCamera]);

  return { videoRef, cameraState, retry };
};
