import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestDoll } from "@/test/factories";
import { renderWithProviders } from "@/test/testUtils";
import type { Doll } from "@/types";
import DollCombobox from "./DollCombobox";

const BLUR_TIMEOUT_MS = 500;

const buildDolls = (): readonly Doll[] => [
  createTestDoll({
    id: "doll-1",
    name: "Alice",
    bodySize: "SD",
    customizer: "Studio A",
  }),
  createTestDoll({
    id: "doll-2",
    name: "Bella",
    bodySize: "MSD",
    customizer: "Studio B",
  }),
  createTestDoll({
    id: "doll-3",
    name: "Cathy",
    bodySize: "YoSD",
    customizer: undefined,
  }),
];

const renderCombobox = async ({
  dolls = buildDolls(),
  selectedDollId,
  onChangeDoll = vi.fn(),
}: {
  readonly dolls?: readonly Doll[];
  readonly selectedDollId?: string;
  readonly onChangeDoll?: ReturnType<typeof vi.fn>;
} = {}) => {
  const utils = await renderWithProviders(
    <DollCombobox
      dolls={dolls}
      selectedDollId={selectedDollId}
      onChangeDoll={onChangeDoll}
    />,
  );
  const combobox = screen.getByRole("combobox");
  return { ...utils, combobox, onChangeDoll };
};

describe("DollCombobox", () => {
  it("初期状態では入力が空でドロップダウンは閉じている", async () => {
    const { combobox } = await renderCombobox();

    expect(combobox).toHaveValue("");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("選択中のドールがある場合は表示値が name (sizeLabel) になる", async () => {
    const { combobox } = await renderCombobox({ selectedDollId: "doll-1" });

    expect(combobox).toHaveValue("Alice (SD (~57cm))");
  });

  it("クリックでドロップダウンが開き全ドール option と全件が表示される", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("全ドール")).toBeInTheDocument();
    expect(within(listbox).getByText("Alice")).toBeInTheDocument();
    expect(within(listbox).getByText("Bella")).toBeInTheDocument();
    expect(within(listbox).getByText("Cathy")).toBeInTheDocument();
  });

  it("name で部分一致フィルタされる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "alic");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Alice")).toBeInTheDocument();
    expect(within(listbox).queryByText("Bella")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Cathy")).not.toBeInTheDocument();
  });

  it("customizer でも検索できる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "studio b");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Bella")).toBeInTheDocument();
    expect(within(listbox).queryByText("Alice")).not.toBeInTheDocument();
  });

  it("sizeLabel でも検索できる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "yosd");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Cathy")).toBeInTheDocument();
    expect(within(listbox).queryByText("Alice")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Bella")).not.toBeInTheDocument();
  });

  it("該当なしの場合に「該当するドールがありません」が表示される", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "zzznotfound");

    expect(screen.getByText("該当するドールがありません")).toBeInTheDocument();
  });

  it("空文字に戻すと再び全件が表示される", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "alice");
    await user.clear(combobox);

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Alice")).toBeInTheDocument();
    expect(within(listbox).getByText("Bella")).toBeInTheDocument();
    expect(within(listbox).getByText("Cathy")).toBeInTheDocument();
  });

  it("閉じている状態で ArrowDown を押すと開く", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    // click で開いてしまうので一度 Escape で閉じてから ArrowDown を試す
    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
  });

  it("閉じている状態で Enter を押しても開かれる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
  });

  it("ArrowDown で末尾を超えると先頭に wrap-around する", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    // totalOptions = 4 ("全ドール" + 3 dolls)。
    // activeIndex は -1 → 0 → 1 → 2 → 3 と進み、次で 0 に戻る。
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    await waitFor(() => {
      expect(combobox).toHaveAttribute(
        "aria-activedescendant",
        expect.stringMatching(/-option-3$/),
      );
    });
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(combobox).toHaveAttribute(
        "aria-activedescendant",
        expect.stringMatching(/-option-0$/),
      );
    });
  });

  it("ArrowUp で先頭より前に行くと末尾に wrap-around する", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    // 初期 activeIndex = -1 から ArrowUp で末尾 (totalOptions-1 = 3) に wrap する
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(combobox).toHaveAttribute(
        "aria-activedescendant",
        expect.stringMatching(/-option-3$/),
      );
    });
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(combobox).toHaveAttribute(
        "aria-activedescendant",
        expect.stringMatching(/-option-2$/),
      );
    });
  });

  it("Enter で activeIndex が 0 のとき undefined が選択される (全ドール)", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({ onChangeDoll });

    await user.click(combobox);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChangeDoll).toHaveBeenCalledWith(undefined);
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("Enter で activeIndex が >= 1 のとき該当ドール ID が選択される", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({ onChangeDoll });

    await user.click(combobox);
    // activeIndex = 1 で先頭ドール (Alice) を選択
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChangeDoll).toHaveBeenCalledWith("doll-1");
  });

  it("activeIndex が -1 の状態の Enter は何も選択しない", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({ onChangeDoll });

    await user.click(combobox);
    await user.keyboard("{Enter}");

    expect(onChangeDoll).not.toHaveBeenCalled();
  });

  it("Escape を押すとドロップダウンが閉じる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ドール option を pointerDown で選択すると onChangeDoll が呼ばれる", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({ onChangeDoll });

    await user.click(combobox);
    const option = screen.getByRole("option", { name: /Bella/ });
    await user.pointer({ keys: "[MouseLeft>]", target: option });

    expect(onChangeDoll).toHaveBeenCalledWith("doll-2");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("「全ドール」option を pointerDown で選択すると undefined が渡される", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({
      selectedDollId: "doll-1",
      onChangeDoll,
    });

    await user.click(combobox);
    const allOption = screen.getByRole("option", { name: /全ドール/ });
    await user.pointer({ keys: "[MouseLeft>]", target: allOption });

    expect(onChangeDoll).toHaveBeenCalledWith(undefined);
  });

  it("blur から 150ms 後にドロップダウンが閉じる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    combobox.blur();

    await waitFor(
      () => {
        expect(combobox).toHaveAttribute("aria-expanded", "false");
      },
      { timeout: BLUR_TIMEOUT_MS },
    );
  });

  it("選択中ドールに該当するオプションには Check アイコンが表示される", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox({ selectedDollId: "doll-2" });

    await user.click(combobox);

    const bellaOption = screen.getByRole("option", { name: /Bella/ });
    expect(bellaOption).toHaveAttribute("aria-selected", "true");

    const aliceOption = screen.getByRole("option", { name: /Alice/ });
    expect(aliceOption).toHaveAttribute("aria-selected", "false");
  });

  it("selectedDollId が undefined のとき「全ドール」option が aria-selected=true になる", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);

    const allOption = screen.getByRole("option", { name: /全ドール/ });
    expect(allOption).toHaveAttribute("aria-selected", "true");
  });

  it("該当なしの状態で Enter を押しても何も選択されない", async () => {
    const user = userEvent.setup();
    const onChangeDoll = vi.fn();
    const { combobox } = await renderCombobox({ onChangeDoll });

    await user.click(combobox);
    await user.type(combobox, "zzz");
    // filtered.length === 0 でも「全ドール」 option (index=0) は残るので
    // ArrowDown + Enter で undefined が選ばれる
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChangeDoll).toHaveBeenCalledWith(undefined);
  });

  it("空白のみの検索クエリでも全件表示される (該当なしメッセージは出ない)", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "   ");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Alice")).toBeInTheDocument();
    expect(within(listbox).getByText("Bella")).toBeInTheDocument();
    expect(within(listbox).getByText("Cathy")).toBeInTheDocument();
    expect(
      screen.queryByText("該当するドールがありません"),
    ).not.toBeInTheDocument();
  });

  it("blur 後すぐに focus を戻すと dropdown は閉じない", async () => {
    const user = userEvent.setup();
    const { combobox } = await renderCombobox();

    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    // 150ms 経過する前に focus を戻すと clearTimeout で閉じない
    combobox.blur();
    combobox.focus();

    await new Promise((resolve) => {
      setTimeout(resolve, BLUR_TIMEOUT_MS);
    });
    expect(combobox).toHaveAttribute("aria-expanded", "true");
  });
});
