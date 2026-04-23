import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/testUtils";
import BulkCapturePage from "./page";

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    readonly href: string;
    readonly children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockCaptureFrame = vi.hoisted(() => vi.fn());
const mockStart = vi.hoisted(() => vi.fn());
const mockStop = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useCamera", () => ({
  useCamera: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    isActive: true,
    error: undefined,
    start: mockStart,
    stop: mockStop,
    captureFrame: mockCaptureFrame,
  }),
}));

vi.mock("@/lib/image/compressImage", () => ({
  compressImage: async ({ file }: { readonly file: File }) =>
    await Promise.resolve({ file, width: 100, height: 100 }),
}));

const testCuidValues = vi.hoisted(() => ({
  index: 0,
  values: ["cuid-1", "cuid-2", "cuid-3", "cuid-4", "cuid-5"],
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => {
    const value =
      testCuidValues.values[testCuidValues.index] ?? "cuid-fallback";
    testCuidValues.index += 1;
    return value;
  },
}));

const createTestBlob = () => new Blob(["test-image"], { type: "image/png" });

describe("BulkCapturePage", () => {
  beforeEach(() => {
    mockRouter.push.mockClear();
    mockCaptureFrame.mockClear();
    mockStart.mockClear();
    mockStop.mockClear();
    testCuidValues.index = 0;
    mockCaptureFrame.mockReturnValue(createTestBlob());

    server.use(
      http.post("*/api/images/upload/*", () =>
        HttpResponse.json({ imageUrl: "https://r2.example.com/test.png" }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態でカメラビューが表示される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    expect(screen.getByText("連続撮影")).toBeInTheDocument();
    expect(screen.getByText("0/30")).toBeInTheDocument();
  });

  it("撮影するとサムネイルが表示される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));

    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
      expect(document.querySelectorAll("img")).toHaveLength(1);
    });
  });

  it("サムネイル削除ボタンでアイテムが除去される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));

    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button").filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg !== null && btn.classList.contains("bg-danger");
    });
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("0/30")).toBeInTheDocument();
    });
  });

  it("「次へ」クリックでメタデータ入力に遷移する", async () => {
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));

    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("名前")).toBeInTheDocument();
      expect(screen.getByLabelText("カテゴリ")).toBeInTheDocument();
      expect(screen.getByText("1 / 1")).toBeInTheDocument();
    });
  });

  it("メタデータフォームで名前入力ができる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("名前")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("名前"), "テストドレス");

    expect(screen.getByLabelText("名前")).toHaveValue("テストドレス");
  });

  it("全アイテムの名前入力後に「登録開始」が押せる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("名前")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "登録開始" })).toBeDisabled();

    await user.type(screen.getByLabelText("名前"), "テストドレス");

    expect(screen.getByRole("button", { name: "登録開始" })).toBeEnabled();
  });

  it("登録完了後に結果が表示される", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("名前")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("名前"), "テストドレス");
    fireEvent.click(screen.getByRole("button", { name: "登録開始" }));

    await waitFor(
      () => {
        expect(screen.getByText("登録完了")).toBeInTheDocument();
        expect(screen.getByText("1件の登録に成功しました")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("「続けて撮影する」でセッションがリセットされる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<BulkCapturePage />);

    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /次へ/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("名前")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("名前"), "テストドレス");
    fireEvent.click(screen.getByRole("button", { name: "登録開始" }));

    await waitFor(
      () => {
        expect(screen.getByText("登録完了")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "続けて撮影する" }));

    await waitFor(() => {
      expect(screen.getByText("0/30")).toBeInTheDocument();
    });
  });
});
