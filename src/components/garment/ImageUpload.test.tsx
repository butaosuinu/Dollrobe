import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import type { UploadState } from "@/hooks/useImageUpload";
import ImageUpload from "./ImageUpload";

const defaultProps = {
  imagePreview: undefined,
  uploadState: { status: "idle" } satisfies UploadState,
  onFileSelect: vi.fn(),
};

describe("ImageUpload", () => {
  it("初期状態で写真追加テキストとカメラアイコンが表示される", () => {
    renderWithProviders(<ImageUpload {...defaultProps} />);

    expect(screen.getByText("写真を追加")).toBeInTheDocument();
  });

  it("imagePreview がある場合はプレビュー画像が表示される", () => {
    renderWithProviders(
      <ImageUpload
        {...defaultProps}
        imagePreview="blob:http://localhost/test"
      />,
    );

    const img = screen.getByAltText("プレビュー");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "blob:http://localhost/test");
  });

  it("圧縮中にオーバーレイが表示される", () => {
    renderWithProviders(
      <ImageUpload
        {...defaultProps}
        imagePreview="blob:http://localhost/test"
        uploadState={{ status: "compressing" }}
      />,
    );

    expect(screen.getByText("圧縮中...")).toBeInTheDocument();
  });

  it("アップロード中にテキストが表示される", () => {
    renderWithProviders(
      <ImageUpload
        {...defaultProps}
        imagePreview="blob:http://localhost/test"
        uploadState={{ status: "uploading" }}
      />,
    );

    expect(screen.getByText("アップロード中...")).toBeInTheDocument();
  });

  it("エラー状態でエラーメッセージが表示される", () => {
    renderWithProviders(
      <ImageUpload
        {...defaultProps}
        uploadState={{
          status: "error",
          message: "ファイルサイズが上限を超えています",
        }}
      />,
    );

    expect(
      screen.getByText("ファイルサイズが上限を超えています"),
    ).toBeInTheDocument();
  });

  it("アップロード中は file input が disabled になる", () => {
    renderWithProviders(
      <ImageUpload {...defaultProps} uploadState={{ status: "uploading" }} />,
    );

    const input = document.querySelector("input[type='file']");
    expect(input).toBeDisabled();
  });

  it("idle 状態では file input が enabled になる", () => {
    renderWithProviders(<ImageUpload {...defaultProps} />);

    const input = document.querySelector("input[type='file']");
    expect(input).not.toBeDisabled();
  });
});
