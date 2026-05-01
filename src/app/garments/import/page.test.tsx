import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { server } from "@/test/mocks/server";
import { trpcMutation } from "@/test/mocks/trpc/index";
import CsvImportPage from "./page";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextLink"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);

const bulkCreateState = { count: 0 };
const bulkCreateSpy = vi.fn();

const uploadCsvFile = async (csvText: string) => {
  const file = new File([csvText], "test.csv", { type: "text/csv" });
  const input = document.querySelector('input[type="file"]');
  expect(input).not.toBeNull();
  fireEvent.change(input!, { target: { files: [file] } });
  await waitFor(() => {
    expect(
      screen.queryByText("CSVファイルをドラッグ&ドロップ"),
    ).not.toBeInTheDocument();
  });
};

describe("CsvImportPage", () => {
  beforeEach(() => {
    navMod.setupNextNavigation();
    bulkCreateSpy.mockClear();
    bulkCreateState.count = 0;
    server.use(
      trpcMutation("garment.bulkCreate", ({ input }) => {
        bulkCreateSpy(input);
        return { count: bulkCreateState.count };
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態でドロップゾーンが表示される", async () => {
    await renderWithProviders(<CsvImportPage />);

    expect(screen.getByText("CSVインポート")).toBeInTheDocument();
    expect(
      screen.getByText("CSVファイルをドラッグ&ドロップ"),
    ).toBeInTheDocument();
    expect(screen.getByText("サンプルCSVをダウンロード")).toBeInTheDocument();
  });

  it("有効なCSVファイルをアップロードするとプレビューに遷移する", async () => {
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile("name,category,dollSize\nドレスA,dress,MSD");

    expect(screen.getByText("プレビュー")).toBeInTheDocument();
    expect(screen.getByText("ドレスA")).toBeInTheDocument();
  });

  it("プレビューで有効行数が表示される", async () => {
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile(
      "name,category,dollSize\nドレスA,dress,MSD\nコートB,outer,SD",
    );

    expect(screen.getByText("2件 有効")).toBeInTheDocument();
  });

  it("無効な行にはエラーが表示される", async () => {
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile(
      "name,category,dollSize\nドレスA,dress,MSD\n,invalid,XXL",
    );

    expect(screen.getByText("1件 有効")).toBeInTheDocument();
    expect(screen.getByText("1件 エラー")).toBeInTheDocument();
  });

  it("必須ヘッダー不足時にエラーが表示される", async () => {
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile("name,brand\nドレスA,ボークス");

    expect(screen.getByText("1件 エラー")).toBeInTheDocument();
  });

  it("プレビューから「戻る」でアップロード画面に戻る", async () => {
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile("name,category,dollSize\nドレスA,dress,MSD");
    expect(screen.getByText("プレビュー")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() => {
      expect(
        screen.getByText("CSVファイルをドラッグ&ドロップ"),
      ).toBeInTheDocument();
    });
  });

  it("インポート実行でtRPC bulkCreateが呼ばれ完了画面が表示される", async () => {
    bulkCreateState.count = 2;
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile(
      "name,category,dollSize\nドレスA,dress,MSD\nコートB,outer,SD",
    );

    fireEvent.click(screen.getByRole("button", { name: "2件をインポート" }));

    await waitFor(() => {
      expect(bulkCreateSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("インポート完了")).toBeInTheDocument();
      expect(screen.getByText("2件の登録に成功しました")).toBeInTheDocument();
    });
  });

  it("完了画面で「続けてインポート」クリックでリセットされる", async () => {
    bulkCreateState.count = 1;
    await renderWithProviders(<CsvImportPage />);

    await uploadCsvFile("name,category,dollSize\nドレスA,dress,MSD");
    fireEvent.click(screen.getByRole("button", { name: "1件をインポート" }));

    await waitFor(() => {
      expect(screen.getByText("インポート完了")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "続けてインポート" }));

    await waitFor(() => {
      expect(
        screen.getByText("CSVファイルをドラッグ&ドロップ"),
      ).toBeInTheDocument();
    });
  });
});
