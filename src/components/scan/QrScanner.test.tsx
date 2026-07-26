import { describe, it, expect, vi, aroundEach } from "vitest";
import { useState } from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import {
  installCanvas2DContext,
  installCanvas2DContextNull,
  installVideoReadyState,
} from "@/test/helpers/canvas";
import {
  createMockMediaStream,
  createMockTrack,
  installMediaDevices,
  installMediaDevicesUnavailable,
  installMediaElementPlayback,
} from "@/test/helpers/mediaDevices";
import { setupJsqr, createMockQRCode } from "@/test/mocks/modules/jsqr";
import QrScanner from "./QrScanner";

const SCAN_INTERVAL_MS = 250;
const SCAN_COOLDOWN_MS = 2000;
const HAVE_ENOUGH_DATA = 4;
const NOT_ENOUGH_DATA = 2;
const VIBRATE_MS = 100;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/**
 * `rerender` は provider ラッパー外の再描画になりコンポーネントが再マウント
 * されてしまうため、prop 変化を実際の親再描画として再現するハーネス。
 * onScan は毎回新しい identity で渡す（ScanPage の実挙動と同じ）。
 */
const ScannerHarness = () => {
  const [isActive, setIsActive] = useState(true);
  const [, setTick] = useState(0);

  return (
    <div>
      <button type="button" onClick={() => setIsActive(false)}>
        deactivate
      </button>
      <button type="button" onClick={() => setTick((tick) => tick + 1)}>
        tick
      </button>
      <QrScanner onScan={() => undefined} isActive={isActive} />
    </div>
  );
};

const setupActiveScanner = () => {
  const track = createMockTrack();
  const stream = createMockMediaStream(track);
  const { getUserMedia } = installMediaDevices({ resolveStream: stream });
  const { ctx } = installCanvas2DContext();
  return { track, stream, getUserMedia, ctx };
};

describe("QrScanner", () => {
  const jsqrHandle: { current: ReturnType<typeof setupJsqr> } = {
    current: setupJsqr(),
  };
  const playHandle: { current: ReturnType<typeof vi.fn> } = {
    current: vi.fn(),
  };

  aroundEach(async (runTest) => {
    vi.useFakeTimers();
    jsqrHandle.current = setupJsqr();

    const { play } = installMediaElementPlayback({
      videoWidth: VIDEO_WIDTH,
      videoHeight: VIDEO_HEIGHT,
    });
    playHandle.current = play;

    installVideoReadyState(HAVE_ENOUGH_DATA, HAVE_ENOUGH_DATA);

    await runTest();

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
    expect(playHandle.current).toHaveBeenCalled();
  });

  it("isActive=false のときは getUserMedia を呼ばない", async () => {
    const { getUserMedia } = installMediaDevices({
      rejectError: new Error("denied"),
    });

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
    installMediaDevices({ rejectError: new Error("denied") });

    const onScan = vi.fn();
    await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
    await flushPromises();

    expect(playHandle.current).not.toHaveBeenCalled();
  });

  it("readyState が HAVE_ENOUGH_DATA でない場合は jsQR を呼ばない", async () => {
    const { ctx } = setupActiveScanner();
    installVideoReadyState(NOT_ENOUGH_DATA, HAVE_ENOUGH_DATA);

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
    const stream = createMockMediaStream(track);
    installMediaDevices({ resolveStream: stream });
    installCanvas2DContextNull();

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
    jsqrHandle.current.mockReturnValue(createMockQRCode(""));

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
    jsqrHandle.current.mockReturnValue(createMockQRCode("dwg://g/abc"));

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
    jsqrHandle.current.mockReturnValue(createMockQRCode("dwg://g/abc"));

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
    jsqrHandle.current.mockReturnValue(createMockQRCode("dwg://g/abc"));

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
    jsqrHandle.current.mockReturnValue(createMockQRCode("dwg://g/abc"));

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
    jsqrHandle.current.mockReturnValue(createMockQRCode("dwg://g/abc"));

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

  describe("カメラ取得失敗時のエラー UI", () => {
    const renderWithCameraError = async (error: Error) => {
      const { getUserMedia } = installMediaDevices({ rejectError: error });
      installCanvas2DContext();

      const onScan = vi.fn();
      await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
      await flushPromises();

      return { getUserMedia, onScan };
    };

    it("権限拒否のときは許可方法の案内と再試行ボタンを表示する", async () => {
      await renderWithCameraError(
        new DOMException("Permission denied", "NotAllowedError"),
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("カメラへのアクセスが拒否されました");
      expect(alert).toHaveTextContent(
        "アドレスバーのカメラアイコン、または端末の設定からこのサイトのカメラを「許可」に変更してください。",
      );
      expect(
        screen.getByRole("button", { name: "カメラを再試行" }),
      ).toBeInTheDocument();
    });

    it("カメラが存在しないときはデバイス確認の案内を表示する", async () => {
      await renderWithCameraError(
        new DOMException("No camera", "NotFoundError"),
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "利用できるカメラが見つかりません",
      );
    });

    it("カメラが使用中のときは他アプリを閉じる案内を表示する", async () => {
      await renderWithCameraError(
        new DOMException("In use", "NotReadableError"),
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "他のアプリがカメラを使用している可能性があります。使用中のアプリを閉じてから再試行してください。",
      );
    });

    it("分類できない失敗のときは汎用メッセージを表示する", async () => {
      await renderWithCameraError(new Error("boom"));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "カメラの起動に失敗しました",
      );
    });

    it("mediaDevices が使えない環境では未対応メッセージを表示する", async () => {
      installMediaDevicesUnavailable();
      installCanvas2DContext();

      const onScan = vi.fn();
      await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
      await flushPromises();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "このブラウザではカメラを使えません",
      );
    });

    it("再試行ボタンで getUserMedia を再実行し、成功するとエラー UI が消える", async () => {
      const { getUserMedia } = await renderWithCameraError(
        new DOMException("Permission denied", "NotAllowedError"),
      );
      expect(getUserMedia).toHaveBeenCalledTimes(1);

      getUserMedia.mockResolvedValue(createMockMediaStream(createMockTrack()));

      fireEvent.click(screen.getByRole("button", { name: "カメラを再試行" }));
      await flushPromises();

      expect(getUserMedia).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("カメラ取得に成功した場合はエラー UI を表示しない", async () => {
      setupActiveScanner();

      const onScan = vi.fn();
      await renderWithProviders(<QrScanner onScan={onScan} isActive={true} />);
      await flushPromises();

      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("isActive=false に戻るとエラー UI を消す", async () => {
      installMediaDevices({
        rejectError: new DOMException("Permission denied", "NotAllowedError"),
      });
      installCanvas2DContext();

      await renderWithProviders(<ScannerHarness />);
      await flushPromises();
      expect(screen.getByRole("alert")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "deactivate" }));
      await flushPromises();

      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("取得完了前にアンマウントされた場合は取得済み stream を停止する", async () => {
      const track = createMockTrack();
      const resolvers: Array<(stream: unknown) => void> = [];
      const getUserMedia = vi.fn(
        async () =>
          await new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      );
      installMediaDevices({ getUserMedia });
      installCanvas2DContext();

      const { unmount } = await renderWithProviders(
        <QrScanner onScan={vi.fn()} isActive={true} />,
      );
      await flushPromises();

      act(() => {
        unmount();
      });

      await act(async () => {
        resolvers[0]?.(createMockMediaStream(track));
        await Promise.resolve();
      });

      expect(track.stop).toHaveBeenCalled();
    });

    it("onScan の identity が変わってもカメラを再取得しない", async () => {
      const { getUserMedia } = setupActiveScanner();

      await renderWithProviders(<ScannerHarness />);
      await flushPromises();
      expect(getUserMedia).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "tick" }));
      await flushPromises();

      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });
  });
});
