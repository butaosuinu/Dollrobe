import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nTestWrapper } from "@/test/i18nWrapper";
import AutocompleteInput from "./AutocompleteInput";

const BLUR_TIMEOUT_MS = 300;

const SUGGESTIONS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry"];

type HarnessProps = {
  readonly initialValue?: string;
  readonly label?: string;
  readonly suggestions?: readonly string[];
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly onChangeSpy?: (value: string) => void;
};

const AutocompleteHarness = ({
  initialValue = "",
  label,
  suggestions = SUGGESTIONS,
  placeholder,
  maxLength,
  onChangeSpy,
}: HarnessProps) => {
  const [value, setValue] = useState(initialValue);
  return (
    <AutocompleteInput
      label={label}
      value={value}
      onChangeValue={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
      suggestions={suggestions}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
};

const renderHarness = (props: HarnessProps = {}) =>
  render(<AutocompleteHarness {...props} />, { wrapper: I18nTestWrapper });

describe("AutocompleteInput", () => {
  it("入力すると一致する suggestion が listbox に表示される", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Apple");
    expect(options[1]).toHaveTextContent("Apricot");
  });

  it("空文字では suggestion が表示されない", async () => {
    const user = userEvent.setup();
    renderHarness({ initialValue: "ap" });

    const input = screen.getByRole("combobox");
    await user.clear(input);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown で wrap-around する", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "a");

    const optionsBefore = screen.getAllByRole("option");
    expect(optionsBefore).toHaveLength(3);

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[2]).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowUp で wrap-around する", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "a");

    await user.keyboard("{ArrowUp}");
    const options = screen.getAllByRole("option");
    expect(options[options.length - 1]).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[options.length - 2]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Enter キーで選択中の項目が確定し listbox が閉じる", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    renderHarness({ onChangeSpy });

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onChangeSpy).toHaveBeenLastCalledWith("Apricot");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("Apricot");
  });

  it("activeIndex が -1 のとき Enter は選択を行わない", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    renderHarness({ onChangeSpy });

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");
    onChangeSpy.mockClear();

    await user.keyboard("{Enter}");

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("Escape で listbox が閉じる", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("listbox が閉じている状態の矢印キーは何もしない", async () => {
    const user = userEvent.setup();
    renderHarness({ initialValue: "zzz" });

    const input = screen.getByRole("combobox");
    input.focus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.keyboard("{ArrowDown}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("一致する suggestion が無い場合 listbox は表示されない", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "zzz");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("label が指定されている場合に表示される", () => {
    renderHarness({ label: "メーカー名" });

    const label = screen.getByText("メーカー名");
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe("LABEL");
  });

  it("label が未指定なら label 要素はレンダーされない", () => {
    const { container } = renderHarness();

    expect(container.querySelector("label")).toBeNull();
  });

  it("blur から 150ms 後に listbox が閉じる", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    input.blur();

    await waitFor(
      () => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      },
      { timeout: BLUR_TIMEOUT_MS },
    );
  });

  it("maxLength が input 要素に適用される", () => {
    renderHarness({ maxLength: 8 });

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("maxLength", "8");
  });

  it("既存値があり filter にヒットする状態でフォーカスすると listbox が開く", async () => {
    const user = userEvent.setup();
    renderHarness({ initialValue: "ap" });

    const input = screen.getByRole("combobox");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(input);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("filter にヒットしない値でフォーカスしても listbox は開かない", async () => {
    const user = userEvent.setup();
    renderHarness({ initialValue: "zzz" });

    const input = screen.getByRole("combobox");
    await user.click(input);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("空文字でフォーカスしても listbox は開かない", async () => {
    const user = userEvent.setup();
    renderHarness({ initialValue: "" });

    const input = screen.getByRole("combobox");
    await user.click(input);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("option を pointerDown で選択できる", async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    renderHarness({ onChangeSpy });

    const input = screen.getByRole("combobox");
    await user.type(input, "b");

    const option = screen.getByRole("option", { name: "Banana" });
    await user.pointer({ keys: "[MouseLeft>]", target: option });

    expect(onChangeSpy).toHaveBeenLastCalledWith("Banana");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("placeholder が input に適用される", () => {
    renderHarness({ placeholder: "メーカーを入力" });

    expect(screen.getByPlaceholderText("メーカーを入力")).toBeInTheDocument();
  });

  it("aria-expanded は listbox 表示状態と連動する", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.type(input, "ap");
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-activedescendant は activeIndex に応じて切り替わる", async () => {
    const user = userEvent.setup();
    renderHarness();

    const input = screen.getByRole("combobox");
    await user.type(input, "ap");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).not.toBeNull();
    expect(activeId).toMatch(/-option-0$/);
  });
});
