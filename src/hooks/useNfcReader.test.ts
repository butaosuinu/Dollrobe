import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNfcReader } from "./useNfcReader";
import { NFC_SCAN_COOLDOWN_MS, VIBRATION_DURATION_MS } from "@/lib/constants";

type MockListenerData = {
  readonly type: string;
};

type MockListenerFn = {
  readonly handler: (event: unknown) => void;
};

type MockListener = MockListenerData & MockListenerFn;

const createMockReader = () => {
  const listeners: MockListener[] = [];
  const scanMock = vi.fn<(options?: { signal?: AbortSignal }) => Promise<void>>(
    async () => {
      await Promise.resolve();
    },
  );

  return {
    listeners,
    scanMock,
    instance: {
      scan: scanMock,
      addEventListener: vi.fn(
        (type: string, handler: (event: unknown) => void) => {
          listeners.push({ type, handler });
        },
      ),
    },
    triggerReading: (event: unknown) => {
      listeners
        .filter((l) => l.type === "reading")
        .forEach((l) => {
          l.handler(event);
        });
    },
    triggerReadingError: (event: unknown) => {
      listeners
        .filter((l) => l.type === "readingerror")
        .forEach((l) => {
          l.handler(event);
        });
    },
  };
};

const createReadingEvent = ({
  recordType,
  data,
  encoding,
}: {
  readonly recordType: string;
  readonly data: string;
  readonly encoding?: string;
}): NDEFReadingEvent => {
  const encoder = new TextEncoder();
  const dataView = new DataView(encoder.encode(data).buffer);

  const baseEvent = new Event("reading");
  return Object.assign(baseEvent, {
    serialNumber: "test-serial",
    message: {
      records: [
        {
          recordType,
          data: dataView,
          encoding,
          toJSON: () => ({}),
        },
      ],
    },
  });
};

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("useNfcReader", () => {
  const mockReaderRef = { current: createMockReader() };
  const vibrateMock = vi.fn();

  beforeEach(() => {
    mockReaderRef.current = createMockReader();

    Object.defineProperty(window, "NDEFReader", {
      value: vi.fn(() => mockReaderRef.current.instance),
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(window, "NDEFReader", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("isActive が false の場合は idle 状態を返す", () => {
    const onScan = vi.fn();
    const { result } = renderHook(() =>
      useNfcReader({ onScan, isActive: false }),
    );

    expect(result.current.nfcState.status).toBe("idle");
    expect(mockReaderRef.current.scanMock).not.toHaveBeenCalled();
  });

  it("NDEFReader が未対応の場合は unsupported 状態を返す", () => {
    Object.defineProperty(window, "NDEFReader", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const onScan = vi.fn();
    const { result } = renderHook(() =>
      useNfcReader({ onScan, isActive: true }),
    );

    expect(result.current.nfcState.status).toBe("unsupported");
  });

  it("スキャン開始成功時に scanning 状態になる", async () => {
    const onScan = vi.fn();
    const { result } = renderHook(() =>
      useNfcReader({ onScan, isActive: true }),
    );

    await flushMicrotasks();

    expect(result.current.nfcState.status).toBe("scanning");
  });

  it("パーミッション拒否時に permission_denied 状態になる", async () => {
    const notAllowedError = new DOMException(
      "NFC permission denied",
      "NotAllowedError",
    );
    mockReaderRef.current.scanMock.mockRejectedValue(notAllowedError);

    const onScan = vi.fn();
    const { result } = renderHook(() =>
      useNfcReader({ onScan, isActive: true }),
    );

    await flushMicrotasks();

    expect(result.current.nfcState.status).toBe("permission_denied");
  });

  it("その他のエラー時に error 状態になる", async () => {
    mockReaderRef.current.scanMock.mockRejectedValue(
      new Error("Unknown NFC error"),
    );

    const onScan = vi.fn();
    const { result } = renderHook(() =>
      useNfcReader({ onScan, isActive: true }),
    );

    await flushMicrotasks();

    expect(result.current.nfcState.status).toBe("error");
    expect(
      result.current.nfcState.status === "error"
        ? result.current.nfcState.message
        : "",
    ).toBe("Unknown NFC error");
  });

  it("URL レコードの dwg:// スキームを読み取り onScan を呼ぶ", async () => {
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await flushMicrotasks();

    const event = createReadingEvent({
      recordType: "url",
      data: "dwg://g/garment-123",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledWith("dwg://g/garment-123");
  });

  it("テキストレコードの dwg:// スキームを読み取り onScan を呼ぶ", async () => {
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await flushMicrotasks();

    const event = createReadingEvent({
      recordType: "text",
      data: "dwg://l/location-456",
      encoding: "utf-8",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledWith("dwg://l/location-456");
  });

  it("dwg:// スキーム以外のレコードは無視する", async () => {
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await flushMicrotasks();

    const event = createReadingEvent({
      recordType: "url",
      data: "https://example.com",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).not.toHaveBeenCalled();
  });

  it("cooldown 期間内の同一データ重複スキャンを無視する", async () => {
    vi.useFakeTimers();
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await vi.advanceTimersByTimeAsync(0);

    const event = createReadingEvent({
      recordType: "url",
      data: "dwg://g/garment-123",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(NFC_SCAN_COOLDOWN_MS - 1);
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cooldown 経過後は同一データでも onScan を呼ぶ", async () => {
    vi.useFakeTimers();
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await vi.advanceTimersByTimeAsync(0);

    const event = createReadingEvent({
      recordType: "url",
      data: "dwg://g/garment-123",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(NFC_SCAN_COOLDOWN_MS);
      mockReaderRef.current.triggerReading(event);
    });

    expect(onScan).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("isActive が false に変わるとスキャンが停止する", async () => {
    const onScan = vi.fn();
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    const { rerender } = renderHook(
      ({ isActive }: { readonly isActive: boolean }) =>
        useNfcReader({ onScan, isActive }),
      { initialProps: { isActive: true } },
    );

    await flushMicrotasks();

    rerender({ isActive: false });

    expect(abortSpy).toHaveBeenCalled();
  });

  it("読み取り成功時に navigator.vibrate を呼ぶ", async () => {
    const onScan = vi.fn();
    renderHook(() => useNfcReader({ onScan, isActive: true }));

    await flushMicrotasks();

    const event = createReadingEvent({
      recordType: "url",
      data: "dwg://g/garment-123",
    });

    act(() => {
      mockReaderRef.current.triggerReading(event);
    });

    expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_DURATION_MS);
  });
});
