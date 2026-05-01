import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import QrScanner from "./QrScanner";

const jsqrMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/jsqr"),
);
vi.mock("jsqr", jsqrMod.jsqrFactory);

const SCAN_INTERVAL_MS = 250;
const SCAN_COOLDOWN_MS = 2000;
const HAVE_ENOUGH_DATA = 4;
const NOT_ENOUGH_DATA = 2;
const VIBRATE_MS = 100;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

type MockTrack = {
  readonly stop: ReturnType<typeof vi.fn>;
};

type MockStream = {
  readonly getTracks: () => readonly MockTrack[];
};

type MockContext = {
  readonly drawImage: ReturnType<typeof vi.fn>;
  readonly getImageData: ReturnType<typeof vi.fn>;
};

const createMockTrack = (): MockTrack => ({
  stop: vi.fn(),
});

const createMockStream = (track: MockTrack): MockStream => ({
  getTracks: () => [track],
});

const createMockContext = (): MockContext => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
});

type SetupGetUserMediaOptions = {
  readonly resolveStream: MockStream | undefined;
};

const setupGetUserMedia = ({ resolveStream }: SetupGetUserMediaOptions) => {
  const getUserMedia = vi.fn<() => Promise<MockStream>>();
  if (resolveStream === undefined) {
    getUserMedia.mockRejectedValue(new Error("denied"));
  } else {
    getUserMedia.mockResolvedValue(resolveStream);
  }

  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    writable: true,
    configurable: true,
  });

  return getUserMedia;
};

const installCanvasContext = (ctx: MockContext | undefined) => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: () => ctx ?? null,
    writable: true,
    configurable: true,
  });
};

const setVideoReadyState = (state: number) => {
  Object.defineProperty(HTMLVideoElement.prototype, "readyState", {
    value: state,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(HTMLVideoElement.prototype, "HAVE_ENOUGH_DATA", {
    value: HAVE_ENOUGH_DATA,
    writable: true,
    configurable: true,
  });
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setupActiveScanner = () => {
  const track = createMockTrack();
  const stream = createMockStream(track);
  const getUserMedia = setupGetUserMedia({ resolveStream: stream });
  const ctx = createMockContext();
  installCanvasContext(ctx);

  return { track, stream, getUserMedia, ctx };
};

describe("QrScanner", () => {
  const jsqrHandle: { current: ReturnType<typeof jsqrMod.setupJsqr> } = {
    current: jsqrMod.setupJsqr(),
  };
  const playMock = vi.fn<() => Promise<undefined>>();

  beforeEach(() => {
    vi.useFakeTimers();
    jsqrHandle.current = jsqrMod.setupJsqr();
    playMock.mockReset();
    playMock.mockResolvedValue(undefined);

    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      value: playMock,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      value: VIDEO_WIDTH,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
      value: VIDEO_HEIGHT,
      writable: true,
      configurable: true,
    });

    setVideoReadyState(HAVE_ENOUGH_DATA);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("isActive=true のとき getUserMedia を呼んでカメラを起動する", async () => {
    const { getUserMedia } = setupActiveScanner();

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
      },
    });
    expect(playMock).toHaveBeenCalled();
  });

  it("isActive=false のときは getUserMedia を呼ばない", async () => {
    const getUserMedia = setupGetUserMedia({ resolveStream: undefined });

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={false} />);
    await flushPromises();

    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("isActive が true→false に変わると stream のトラックを停止する", async () => {
    const { track } = setupActiveScanner();

    const onScan = vi.fn();
    const { rerender } = await renderWithProviders(
      <QrScanner onScan={onScan} isActive={true} />,
    );
    await flushPromises();

    act(() => {
      rerender(<QrScanner onScan={onScan} isActive={false} />);
    });

    expect(track.stop).toHaveBeenCalled();
  });

  it("getUserMedia が拒否された場合でもエラーが伝搬しない", async () => {
    setupGetUserMedia({ resolveStream: undefined });

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    expect(playMock).not.toHaveBeenCalled();
  });

  it("readyState が HAVE_ENOUGH_DATA でない場合は jsQR を呼ばない", async () => {
    const { ctx } = setupActiveScanner();
    setVideoReadyState(NOT_ENOUGH_DATA);

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(jsqrHandle.current).not.toHaveBeenCalled();
  });

  it("getContext が null を返す場合は jsQR を呼ばない", async () => {
    const track = createMockTrack();
    const stream = createMockStream(track);
    setupGetUserMedia({ resolveStream: stream });
    installCanvasContext(undefined);

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(jsqrHandle.current).not.toHaveBeenCalled();
  });

  it("jsQR が null を返す場合は onScan を呼ばない", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(null);

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(jsqrHandle.current).toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
  });

  it("jsQR が空文字を返す場合は onScan を呼ばない", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode(""));

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(onScan).not.toHaveBeenCalled();
  });

  it("QR コード検出時に onScan を呼ぶ", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode("dwg://g/abc"));

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(onScan).toHaveBeenCalledWith("dwg://g/abc");
  });

  it("SCAN_COOLDOWN_MS 内の同一データ重複検出は無視する", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode("dwg://g/abc"));

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });
    expect(onScan).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("SCAN_COOLDOWN_MS 経過後は同一データでも onScan を呼ぶ", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode("dwg://g/abc"));

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });
    expect(onScan).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_COOLDOWN_MS + SCAN_INTERVAL_MS);
    });
    expect(onScan).toHaveBeenCalledTimes(2);
  });

  it("検出時に navigator.vibrate が呼ばれる（vibrate あり）", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode("dwg://g/abc"));

    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(vibrateMock).toHaveBeenCalledWith(VIBRATE_MS);
  });

  it("vibrate が undefined の場合でもエラーにならない", async () => {
    setupActiveScanner();
    jsqrHandle.current.mockReturnValue(jsqrMod.createMockQRCode("dwg://g/abc"));

    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SCAN_INTERVAL_MS);
    });

    expect(onScan).toHaveBeenCalledWith("dwg://g/abc");
  });
});
