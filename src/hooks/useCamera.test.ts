import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCamera } from "./useCamera";
import { BULK_CAPTURE } from "@/lib/constants";

const PNG_DATA_URL = `data:${BULK_CAPTURE.OUTPUT_FORMAT};base64,iVBORw0KGgo=`;
const NO_HEADER_DATA_URL = "iVBORw0KGgo=";
const HEADER_ONLY_DATA_URL = "data:image/png;base64,";
const VIDEO_DEFAULT_WIDTH = 100;
const VIDEO_DEFAULT_HEIGHT = 80;

const createStream = (trackStop: () => void = () => undefined): MediaStream => {
  const stream = new MediaStream();
  Object.defineProperty(stream, "getTracks", {
    value: () => [{ stop: trackStop }],
    configurable: true,
  });
  return stream;
};

const getUserMediaMock = vi.fn();

const setMediaDevices = (value: { readonly getUserMedia: typeof vi.fn }) => {
  Object.defineProperty(navigator, "mediaDevices", {
    value,
    configurable: true,
    writable: true,
  });
};

const attachVideo = ({
  videoRef,
  videoWidth = VIDEO_DEFAULT_WIDTH,
  videoHeight = VIDEO_DEFAULT_HEIGHT,
}: {
  readonly videoRef: React.RefObject<HTMLVideoElement | null>;
  readonly videoWidth?: number;
  readonly videoHeight?: number;
}) => {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", {
    value: videoWidth,
    configurable: true,
  });
  Object.defineProperty(video, "videoHeight", {
    value: videoHeight,
    configurable: true,
  });
  Object.defineProperty(video, "play", {
    value: vi.fn(async () => {
      await Promise.resolve();
    }),
    configurable: true,
  });
  Object.defineProperty(videoRef, "current", {
    value: video,
    configurable: true,
    writable: true,
  });
  return video;
};

const attachCanvas = ({
  canvasRef,
}: {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) => {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvasRef, "current", {
    value: canvas,
    configurable: true,
    writable: true,
  });
  return canvas;
};

type DrawImageMock = ReturnType<typeof vi.fn>;

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "getContext",
);
const originalToDataURL = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  "toDataURL",
);

const installCanvasContext = ({
  drawImage,
  dataUrl,
}: {
  readonly drawImage: DrawImageMock | undefined;
  readonly dataUrl: string;
}) => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: () => (drawImage === undefined ? null : { drawImage }),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    value: () => dataUrl,
    configurable: true,
    writable: true,
  });
};

const restoreCanvasPrototype = () => {
  if (originalGetContext !== undefined) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getContext",
      originalGetContext,
    );
  }
  if (originalToDataURL !== undefined) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "toDataURL",
      originalToDataURL,
    );
  }
};

describe("useCamera", () => {
  beforeEach(() => {
    getUserMediaMock.mockReset();
    setMediaDevices({ getUserMedia: getUserMediaMock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreCanvasPrototype();
  });

  it("初期値は isActive=false / error=undefined", () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  describe("start()", () => {
    it("getUserMedia 成功時に isActive=true となり video に stream がセットされる", async () => {
      const stream = createStream();
      getUserMediaMock.mockResolvedValue(stream);

      const { result } = renderHook(() => useCamera());
      const video = attachVideo({ videoRef: result.current.videoRef });

      await act(async () => {
        await result.current.start();
      });

      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBeUndefined();
      expect(video.srcObject).toBe(stream);
    });

    it("video ref が null の場合でも isActive=true で stream は保持される", async () => {
      const stream = createStream();
      getUserMediaMock.mockResolvedValue(stream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBeUndefined();
    });

    it("getUserMedia 失敗時は isActive=false / error メッセージがセットされる", async () => {
      getUserMediaMock.mockRejectedValue(new Error("permission denied"));

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.error).toBe("カメラへのアクセスが拒否されました");
    });
  });

  describe("stop()", () => {
    it("start 後に stop すると track.stop が呼ばれ isActive=false になる", async () => {
      const trackStop = vi.fn();
      getUserMediaMock.mockResolvedValue(createStream(trackStop));

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(trackStop).toHaveBeenCalledTimes(1);
      expect(result.current.isActive).toBe(false);
    });

    it("start していない状態で stop してもエラーにならない", () => {
      const { result } = renderHook(() => useCamera());

      expect(() => {
        act(() => {
          result.current.stop();
        });
      }).not.toThrow();

      expect(result.current.isActive).toBe(false);
    });
  });

  describe("captureFrame()", () => {
    it("video ref が null のときは undefined を返す", () => {
      const { result } = renderHook(() => useCamera());
      attachCanvas({ canvasRef: result.current.canvasRef });

      const blob = result.current.captureFrame();

      expect(blob).toBeUndefined();
    });

    it("canvas ref が null のときは undefined を返す", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });

      const blob = result.current.captureFrame();

      expect(blob).toBeUndefined();
    });

    it("getContext('2d') が null を返したとき undefined を返す", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });
      attachCanvas({ canvasRef: result.current.canvasRef });
      installCanvasContext({ drawImage: undefined, dataUrl: PNG_DATA_URL });

      const blob = result.current.captureFrame();

      expect(blob).toBeUndefined();
    });

    it("正常系: drawImage と toDataURL を経由して Blob を返す", () => {
      const { result } = renderHook(() => useCamera());
      const video = attachVideo({
        videoRef: result.current.videoRef,
        videoWidth: 320,
        videoHeight: 240,
      });
      const canvas = attachCanvas({ canvasRef: result.current.canvasRef });
      const drawImage = vi.fn();
      installCanvasContext({ drawImage, dataUrl: PNG_DATA_URL });

      const blob = result.current.captureFrame();

      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(240);
      expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 240);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe(BULK_CAPTURE.OUTPUT_FORMAT);
    });

    it("toDataURL がカンマを含まない場合（base64 部分が undefined）は undefined を返す", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });
      attachCanvas({ canvasRef: result.current.canvasRef });
      installCanvasContext({
        drawImage: vi.fn(),
        dataUrl: NO_HEADER_DATA_URL,
      });

      const blob = result.current.captureFrame();

      expect(blob).toBeUndefined();
    });

    it("data URL のヘッダから MIME を抽出する", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });
      attachCanvas({ canvasRef: result.current.canvasRef });
      installCanvasContext({
        drawImage: vi.fn(),
        dataUrl: "data:image/jpeg;base64,iVBORw0KGgo=",
      });

      const blob = result.current.captureFrame();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe("image/jpeg");
    });

    it("data URL のヘッダに ':' / ';' が無い場合はデフォルト MIME を使う", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });
      attachCanvas({ canvasRef: result.current.canvasRef });
      installCanvasContext({
        drawImage: vi.fn(),
        dataUrl: "header,iVBORw0KGgo=",
      });

      const blob = result.current.captureFrame();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe(BULK_CAPTURE.OUTPUT_FORMAT);
    });

    it("ヘッダのみで base64 部分が空の場合は空 Blob を返す", () => {
      const { result } = renderHook(() => useCamera());
      attachVideo({ videoRef: result.current.videoRef });
      attachCanvas({ canvasRef: result.current.canvasRef });
      installCanvasContext({
        drawImage: vi.fn(),
        dataUrl: HEADER_ONLY_DATA_URL,
      });

      const blob = result.current.captureFrame();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.size).toBe(0);
    });
  });
});
