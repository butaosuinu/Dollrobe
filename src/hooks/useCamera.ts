import { useCallback, useRef, useState } from "react";
import { BULK_CAPTURE } from "@/lib/constants";

type UseCameraActions = {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly captureFrame: () => Blob | undefined;
};

type UseCameraState = {
  readonly videoRef: React.RefObject<HTMLVideoElement | null>;
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly isActive: boolean;
  readonly error: string | undefined;
};

type UseCameraResult = UseCameraActions & UseCameraState;

const setupVideo = (video: HTMLVideoElement, stream: MediaStream): void => {
  Object.assign(video, { srcObject: stream });
  video.play().catch(() => undefined);
};

const dataUrlToBlob = (dataUrl: string): Blob | undefined => {
  const [header, base64] = dataUrl.split(",");
  const colonIdx = header?.indexOf(":") ?? -1;
  const semiIdx = header?.indexOf(";") ?? -1;
  const mime =
    colonIdx >= 0 && semiIdx > colonIdx
      ? (header?.slice(colonIdx + 1, semiIdx) ?? BULK_CAPTURE.OUTPUT_FORMAT)
      : BULK_CAPTURE.OUTPUT_FORMAT;
  return base64 === undefined
    ? undefined
    : new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], {
        type: mime,
      });
};

export const useCamera = (): UseCameraResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const start = useCallback(async () => {
    setError(undefined);
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: BULK_CAPTURE.CAPTURE_RESOLUTION },
          height: { ideal: BULK_CAPTURE.CAPTURE_RESOLUTION },
        },
      })
      .catch(() => undefined);

    setIsActive(stream !== undefined);
    setError(
      stream === undefined ? "カメラへのアクセスが拒否されました" : undefined,
    );

    const { current: video } = videoRef;
    if (stream !== undefined) {
      streamRef.current = stream;
      if (video !== null) {
        setupVideo(video, stream);
      }
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = undefined;
    setIsActive(false);
  }, []);

  const captureFrame = useCallback((): Blob | undefined => {
    const { current: video } = videoRef;
    const { current: canvas } = canvasRef;

    return video === null || canvas === null
      ? undefined
      : (() => {
          const ctx = canvas.getContext("2d");
          return ctx === null
            ? undefined
            : (() => {
                const { videoWidth: w, videoHeight: h } = video;
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(video, 0, 0, w, h);
                return dataUrlToBlob(
                  canvas.toDataURL(BULK_CAPTURE.OUTPUT_FORMAT),
                );
              })();
        })();
  }, []);

  return { videoRef, canvasRef, isActive, error, start, stop, captureFrame };
};
