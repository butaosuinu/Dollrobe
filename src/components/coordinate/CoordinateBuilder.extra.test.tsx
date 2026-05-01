import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import {
  COORDINATE_NAME_MAX_LENGTH,
  COORDINATE_MEMO_MAX_LENGTH,
} from "@/lib/constants";
import type { Coordinate } from "@/types";
import CoordinateBuilder from "./CoordinateBuilder";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);

type SetupParams = {
  readonly seedGarments?: boolean;
  readonly initial?: Coordinate;
  readonly onSubmit?: ReturnType<typeof vi.fn>;
  readonly onCancel?: ReturnType<typeof vi.fn>;
};

const buildInitial = (overrides: Partial<Coordinate> = {}): Coordinate => ({
  id: "existing",
  userId: "user-1",
  name: "編集前",
  garmentIds: [],
  isAiGenerated: false,
  memo: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

const setup = async ({
  seedGarments = true,
  initial,
  onSubmit,
  onCancel,
}: SetupParams = {}) => {
  if (seedGarments) {
    testDb.garment.create({
      id: "g-1",
      name: "服A",
      category: "tops",
      imageUrl: "https://example.com/a.jpg",
    });
    testDb.garment.create({
      id: "g-2",
      name: "服B",
      category: "bottoms",
    });
    testDb.garment.create({
      id: "g-3",
      name: "服C",
      category: "dress",
      tags: ["フォーマル"],
    });
  }
  await seedDbFromTestDb();

  const submitMock = onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const result = await renderWithProviders(
    <CoordinateBuilder
      initial={initial}
      submitLabel="保存"
      onSubmit={submitMock}
      onCancel={onCancel}
    />,
  );

  return { onSubmit: submitMock, onCancel, ...result };
};

describe("CoordinateBuilder extra", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navMod.setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("登録された服が無い場合は空状態のメッセージを出す", async () => {
    await setup({ seedGarments: false });

    expect(
      await screen.findByText("登録された服がありません"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("一致する服が見つかりません"),
    ).not.toBeInTheDocument();
  });

  it("検索クエリに一致しない場合は『見つかりません』を表示する", async () => {
    const user = userEvent.setup();
    await setup();

    await user.type(
      await screen.findByPlaceholderText("名前やタグで検索..."),
      "存在しないキーワード",
    );

    expect(
      await screen.findByText("一致する服が見つかりません"),
    ).toBeInTheDocument();
  });

  it("検索を空に戻すと全件表示に戻る", async () => {
    const user = userEvent.setup();
    await setup();

    const searchInput = await screen.findByPlaceholderText(
      "名前やタグで検索...",
    );
    await user.type(searchInput, "服A");
    expect(
      screen.queryByRole("button", { name: /服B/ }),
    ).not.toBeInTheDocument();

    await user.clear(searchInput);
    expect(screen.getByRole("button", { name: /服A/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /服B/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /服C/ })).toBeInTheDocument();
  });

  it("画像 URL が設定された服はサムネイル画像が表示される", async () => {
    await setup();

    const garmentATile = await screen.findByRole("button", {
      name: /服A/,
      pressed: false,
    });
    const tileImage = within(garmentATile).getByRole("img", { name: "服A" });
    expect(tileImage).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("選択中リストでも画像 URL があればサムネイルが表示される", async () => {
    await setup({
      initial: buildInitial({
        garmentIds: ["g-1"],
      }),
    });

    const removeButton = await screen.findByRole("button", { name: "削除" });
    const selectedItem = removeButton.closest("li");
    expect(selectedItem).not.toBeNull();
    if (selectedItem === null) return;
    const thumb = within(selectedItem).getByRole("img", { name: "服A" });
    expect(thumb).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("末尾の服の『下へ』は無効、先頭の『上へ』も無効", async () => {
    await setup({
      initial: buildInitial({ garmentIds: ["g-1", "g-2"] }),
    });

    const moveDownButtons = await screen.findAllByRole("button", {
      name: "下へ",
    });
    const moveUpButtons = screen.getAllByRole("button", { name: "上へ" });

    expect(moveUpButtons[0]).toBeDisabled();
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
    expect(moveUpButtons[1]).toBeEnabled();
    expect(moveDownButtons[0]).toBeEnabled();
  });

  it("『下へ』ボタンで選択中の服を入れ替えできる", async () => {
    const user = userEvent.setup();
    await setup({
      initial: buildInitial({ garmentIds: ["g-1", "g-2"] }),
    });

    const moveDownButtons = await screen.findAllByRole("button", {
      name: "下へ",
    });
    const firstMoveDown = moveDownButtons[0];
    expect(firstMoveDown).toBeDefined();
    if (firstMoveDown === undefined) return;
    const list = firstMoveDown.closest("ul");
    expect(list).not.toBeNull();
    if (list === null) return;
    await user.click(firstMoveDown);

    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("服B");
    expect(items[1]).toHaveTextContent("服A");
  });

  it("名前が空白のみの場合も保存ボタンは無効のまま", async () => {
    const user = userEvent.setup();
    await setup();

    const submit = await screen.findByRole("button", { name: "保存" });
    await user.type(screen.getByLabelText("コーデ名"), "   ");
    await user.click(
      screen.getByRole("button", { name: /服A/, pressed: false }),
    );

    expect(submit).toBeDisabled();
  });

  it("メモが空白のみなら undefined として送信される", async () => {
    const user = userEvent.setup();
    const { onSubmit } = await setup();

    await user.click(
      await screen.findByRole("button", { name: /服A/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "コーデ");
    await user.type(screen.getByLabelText("メモ"), "   ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "コーデ",
      memo: undefined,
      garmentIds: ["g-1"],
    });
  });

  it("名前と メモ には maxLength 制約が付与されている", async () => {
    await setup();

    const nameInput = await screen.findByLabelText("コーデ名");
    expect(nameInput).toHaveAttribute(
      "maxLength",
      String(COORDINATE_NAME_MAX_LENGTH),
    );

    const memoInput = screen.getByLabelText("メモ");
    expect(memoInput).toHaveAttribute(
      "maxLength",
      String(COORDINATE_MEMO_MAX_LENGTH),
    );
  });

  it("選択した服を再クリックすると選択解除される", async () => {
    const user = userEvent.setup();
    await setup();

    const tile = await screen.findByRole("button", {
      name: /服A/,
      pressed: false,
    });
    await user.click(tile);
    expect(
      await screen.findByRole("button", { name: /服A/, pressed: true }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /服A/, pressed: true }),
    );
    expect(
      await screen.findByRole("button", { name: /服A/, pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "削除" }),
    ).not.toBeInTheDocument();
  });

  it("onCancel が渡されている場合はキャンセルボタンを表示する", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    await setup({ onCancel });

    const cancel = await screen.findByRole("button", { name: "キャンセル" });
    await user.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("onCancel が undefined の場合はキャンセルボタンが表示されない", async () => {
    await setup();

    expect(
      screen.queryByRole("button", { name: "キャンセル" }),
    ).not.toBeInTheDocument();
  });

  it("onSubmit が Error を投げると submitError をアラートで表示する", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("ネットワークエラーが発生しました"));
    await setup({ onSubmit });

    await user.click(
      await screen.findByRole("button", { name: /服A/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "コーデ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("ネットワークエラーが発生しました");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("onSubmit が Error 以外を投げるとデフォルトメッセージを表示する", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue("文字列エラー");
    await setup({ onSubmit });

    await user.click(
      await screen.findByRole("button", { name: /服A/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "コーデ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("保存に失敗しました");
  });

  it("初期値に存在しない garmentId が含まれていても submit 時には除外される", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    await setup({
      onSubmit,
      initial: buildInitial({
        garmentIds: ["g-1", "missing-id"],
        name: "既存コーデ",
      }),
    });

    await user.click(await screen.findByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "既存コーデ",
      memo: undefined,
      garmentIds: ["g-1"],
    });
  });

  it("初期 memo が指定されている場合は trim された値が送信される", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    await setup({
      onSubmit,
      initial: buildInitial({
        garmentIds: ["g-1"],
        name: "既存コーデ",
        memo: "  既存メモ  ",
      }),
    });

    await user.click(await screen.findByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "既存コーデ",
      memo: "既存メモ",
      garmentIds: ["g-1"],
    });
  });
});
