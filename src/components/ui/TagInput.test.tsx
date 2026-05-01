import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import TagInput from "./TagInput";

type RenderOverrides = {
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly onChangeTags?: (tags: readonly string[]) => void;
  readonly placeholder?: string;
};

const renderTagInput = (overrides: RenderOverrides = {}) => {
  const onChangeTags = overrides.onChangeTags ?? vi.fn();
  const props = {
    label: overrides.label,
    tags: overrides.tags ?? [],
    onChangeTags,
    placeholder: overrides.placeholder,
  };
  const utils = render(<TagInput {...props} />, {
    wrapper: I18nTestWrapper,
  });
  return { ...utils, onChangeTags };
};

describe("TagInput", () => {
  it("label が指定されたら表示される", () => {
    renderTagInput({ label: "タグ", tags: [] });

    expect(screen.getByText("タグ")).toBeInTheDocument();
  });

  it("label が未指定なら表示されない", () => {
    renderTagInput({ tags: [] });

    expect(screen.queryByText("タグ")).not.toBeInTheDocument();
  });

  it("tags が空ならデフォルト placeholder が表示される", () => {
    renderTagInput({ tags: [] });

    expect(screen.getByPlaceholderText("タグを入力...")).toBeInTheDocument();
  });

  it("tags が空なら指定された placeholder が表示される", () => {
    renderTagInput({ tags: [], placeholder: "カスタム..." });

    expect(screen.getByPlaceholderText("カスタム...")).toBeInTheDocument();
  });

  it("tags があるとき placeholder は空になる", () => {
    renderTagInput({ tags: ["既存"], placeholder: "カスタム..." });

    expect(
      screen.queryByPlaceholderText("カスタム..."),
    ).not.toBeInTheDocument();
  });

  it("Enter キーでタグが追加される", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: [], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "新タグ{Enter}");

    expect(onChangeTags).toHaveBeenCalledWith(["新タグ"]);
  });

  it("blur でタグが追加される", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: [], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "blurタグ");
    await user.tab();

    expect(onChangeTags).toHaveBeenCalledWith(["blurタグ"]);
  });

  it("重複したタグの追加はスキップされる", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: ["既存"], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "既存{Enter}");

    expect(onChangeTags).not.toHaveBeenCalled();
  });

  it("空白のみの入力はスキップされる", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: [], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "   {Enter}");

    expect(onChangeTags).not.toHaveBeenCalled();
  });

  it("入力が空のとき Backspace で末尾タグが削除される", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: ["a", "b"], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    input.focus();
    await user.keyboard("{Backspace}");

    expect(onChangeTags).toHaveBeenCalledWith(["a"]);
  });

  it("入力に文字があるときの Backspace ではタグ削除が起きない", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: ["a"], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "x{Backspace}");

    expect(onChangeTags).not.toHaveBeenCalled();
  });

  it("tags が空のとき Backspace では何も起きない", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: [], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    input.focus();
    await user.keyboard("{Backspace}");

    expect(onChangeTags).not.toHaveBeenCalled();
  });

  it("X ボタンクリックでタグが削除される", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: ["a", "b", "c"], onChangeTags });
    const user = userEvent.setup();

    const removeButton = screen.getByRole("button", { name: "bを削除" });
    await user.click(removeButton);

    expect(onChangeTags).toHaveBeenCalledWith(["a", "c"]);
  });

  it("既存タグはチップとして全件描画される", () => {
    renderTagInput({ tags: ["red", "blue", "green"] });

    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText("blue")).toBeInTheDocument();
    expect(screen.getByText("green")).toBeInTheDocument();
  });

  it("追加された文字列は trim されて反映される", async () => {
    const onChangeTags = vi.fn();
    renderTagInput({ tags: [], onChangeTags });
    const user = userEvent.setup();

    const input = screen.getByRole("textbox");
    await user.type(input, "  spaced  {Enter}");

    expect(onChangeTags).toHaveBeenCalledWith(["spaced"]);
  });
});
