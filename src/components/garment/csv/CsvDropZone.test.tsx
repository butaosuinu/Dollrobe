import { describe, it, expect, vi, aroundEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import CsvDropZone from "./CsvDropZone";

const createCsvFile = ({
  name = "garments.csv",
  type = "text/csv",
  content = "name,category,dollSize\nテスト,tops,SD\n",
}: {
  readonly name?: string;
  readonly type?: string;
  readonly content?: string;
} = {}): File => new File([content], name, { type });

const buildDataTransfer = (file: File): DataTransfer => {
  const dt = new DataTransfer();
  dt.items.add(file);
  return dt;
};

const getDropZone = (): HTMLElement => {
  const dropZone = document.querySelector<HTMLElement>(".border-dashed");
  expect(dropZone).not.toBeNull();
  return dropZone ?? document.body;
};

describe("CsvDropZone", () => {
  const createObjectUrlSpy = vi.fn(() => "blob:mock-url");
  const revokeObjectUrlSpy = vi.fn();

  aroundEach(async (runTest) => {
    createObjectUrlSpy.mockClear();
    revokeObjectUrlSpy.mockClear();
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectUrlSpy);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectUrlSpy);

    await runTest();

    vi.restoreAllMocks();
  });

  it("ドロップゾーンとサンプル CSV ボタンが表示される", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    expect(
      screen.getByText("CSVファイルをドラッグ&ドロップ"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /サンプルCSVをダウンロード/ }),
    ).toBeInTheDocument();
  });

  it("text/csv の MIME type を持つファイルをドロップすると onFileLoaded が呼ばれる", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const file = createCsvFile({ content: "name,category,dollSize\na,b,c" });
    fireEvent.drop(getDropZone(), { dataTransfer: buildDataTransfer(file) });

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith(
        "name,category,dollSize\na,b,c",
      );
    });
  });

  it("拡張子 .csv のファイルは MIME type が違っても受け入れられる", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const file = createCsvFile({
      name: "data.CSV",
      type: "application/octet-stream",
      content: "header\nvalue",
    });
    fireEvent.drop(getDropZone(), { dataTransfer: buildDataTransfer(file) });

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith("header\nvalue");
    });
  });

  it("CSV 以外のファイルをドロップするとエラーメッセージが表示される", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const file = new File(["{}"], "garments.json", {
      type: "application/json",
    });
    fireEvent.drop(getDropZone(), { dataTransfer: buildDataTransfer(file) });

    await waitFor(() => {
      expect(
        screen.getByText("CSVファイルを選択してください"),
      ).toBeInTheDocument();
    });
    expect(onFileLoaded).not.toHaveBeenCalled();
  });

  it("dragOver でドラッグ中の見た目に切り替わる", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const dropZone = getDropZone();

    fireEvent.dragOver(dropZone, { dataTransfer: new DataTransfer() });
    await waitFor(() => {
      expect(dropZone.className).toContain("border-primary-400");
    });

    fireEvent.dragLeave(dropZone, { dataTransfer: new DataTransfer() });
    await waitFor(() => {
      expect(dropZone.className).not.toContain("border-primary-400");
    });
  });

  it("空の dataTransfer ではコールバックが呼ばれない", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    fireEvent.drop(getDropZone(), { dataTransfer: new DataTransfer() });

    expect(onFileLoaded).not.toHaveBeenCalled();
  });

  it("input の change イベントでもファイルを処理する", async () => {
    const user = userEvent.setup();
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeTruthy();
    if (fileInput === null) return;

    const file = createCsvFile({ content: "a,b\n1,2" });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith("a,b\n1,2");
    });
  });

  it("ファイル未選択の input change ではコールバックが呼ばれない", async () => {
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput === null) return;

    fireEvent.change(fileInput, { target: { files: [] } });

    expect(onFileLoaded).not.toHaveBeenCalled();
  });

  it("サンプル CSV ダウンロードボタンをクリックすると Blob URL が生成される", async () => {
    const user = userEvent.setup();
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const button = screen.getByRole("button", {
      name: /サンプルCSVをダウンロード/,
    });
    await user.click(button);

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
  });

  it("ドロップゾーンクリックで隠しファイル input がクリックされる", async () => {
    const user = userEvent.setup();
    const onFileLoaded = vi.fn();
    await renderWithProviders(<CsvDropZone onFileLoaded={onFileLoaded} />);

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput === null) return;

    const inputClickSpy = vi
      .spyOn(fileInput, "click")
      .mockImplementation(() => undefined);

    await user.click(getDropZone());

    expect(inputClickSpy).toHaveBeenCalled();
  });
});
