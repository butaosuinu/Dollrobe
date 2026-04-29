import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { createTestStorageLocation } from "@/test/factories";
import StorageLocationEditForm from "./StorageLocationEditForm";

describe("StorageLocationEditForm", () => {
  it("初期値として undefined のフィールドは空文字でレンダリングされる", async () => {
    const location = createTestStorageLocation({
      customName: undefined,
      description: undefined,
    });

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("カスタム名称")).toHaveValue("");
    expect(screen.getByLabelText("説明")).toHaveValue("");
  });

  it("既存の customName / description を初期値として表示する", async () => {
    const location = createTestStorageLocation({
      customName: "ワンピース用",
      description: "春物を収納",
    });

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("カスタム名称")).toHaveValue("ワンピース用");
    expect(screen.getByLabelText("説明")).toHaveValue("春物を収納");
  });

  it("空白のみが入力されたフィールドは undefined として送信される", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const location = createTestStorageLocation();

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("カスタム名称"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("説明"), {
      target: { value: "   " },
    });
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      customName: undefined,
      description: undefined,
    });
  });

  it("入力された値は trim されて送信される", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const location = createTestStorageLocation();

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("カスタム名称"), {
      target: { value: "  ドレス用  " },
    });
    fireEvent.change(screen.getByLabelText("説明"), {
      target: { value: "  夏物  " },
    });
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      customName: "ドレス用",
      description: "夏物",
    });
  });

  it("キャンセルボタンで onCancel が呼ばれる", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const location = createTestStorageLocation();

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("ラベルが表示される", async () => {
    const location = createTestStorageLocation({ label: "B-2" });

    await renderWithProviders(
      <StorageLocationEditForm
        location={location}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("ラベル: B-2")).toBeInTheDocument();
  });
});
