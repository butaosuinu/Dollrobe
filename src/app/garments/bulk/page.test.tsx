import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import {
  installCanvas2DContext,
  installCanvasToDataURL,
} from "@/test/helpers/canvas";
import { flushPromises } from "@/test/helpers/flushPromises";
import {
  createMockMediaStream,
  createMockTrack,
  installMediaDevices,
  installMediaElementPlayback,
} from "@/test/helpers/mediaDevices";
import { renderWithProviders } from "@/test/testUtils";
import BulkCapturePage from "./page";

vi.mock("@/lib/image/compressImage", () => ({
  compressImage: async ({ file }: { readonly file: File }) =>
    await Promise.resolve({ file, width: 100, height: 100 }),
}));

describe("BulkCapturePage", () => {
  aroundEach(async (runTest) => {
    setupNextNavigation();
    installMediaDevices({
      resolveStream: createMockMediaStream(createMockTrack()),
    });
    installCanvas2DContext();
    installCanvasToDataURL("data:image/jpeg;base64,VEVTVA==");
    installMediaElementPlayback({ videoWidth: 640, videoHeight: 480 });

    server.use(
      http.post("*/api/images/upload/*", () =>
        HttpResponse.json({ imageUrl: "https://r2.example.com/test.png" }),
      ),
    );

    await runTest();

    vi.restoreAllMocks();
  });

  const clickCaptureWhenReady = async () => {
    await flushPromises();
    fireEvent.click(screen.getByRole("button", { name: "" }));
  };

  it("初期状態でカメラビューが表示される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    expect(screen.getByText("連続撮影")).toBeInTheDocument();
    expect(screen.getByText("0/30")).toBeInTheDocument();
  });

  it("撮影するとサムネイルが表示される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    await clickCaptureWhenReady();

    await waitFor(() => {
      expect(screen.getByText("1/30")).toBeInTheDocument();
      expect(document.querySelectorAll("img")).toHaveLength(1);
    });
  });

  it("サムネイル削除ボタンでアイテムが除去される", async () => {
    await renderWithProviders(<BulkCapturePage />);

    await clickCaptureWhenReady();

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

    await clickCaptureWhenReady();

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

    await clickCaptureWhenReady();
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

    await clickCaptureWhenReady();
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

    await clickCaptureWhenReady();
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

    await clickCaptureWhenReady();
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
