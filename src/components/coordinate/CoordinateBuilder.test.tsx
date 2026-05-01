import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import CoordinateBuilder from "./CoordinateBuilder";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);

const setup = async (props?: {
  readonly initialIds?: readonly string[];
  readonly initialName?: string;
  readonly initialMemo?: string;
}) => {
  testDb.garment.create({ id: "g-1", name: "服A" });
  testDb.garment.create({ id: "g-2", name: "服B" });
  testDb.garment.create({
    id: "g-3",
    name: "服C",
    tags: ["フォーマル"],
  });
  await seedDbFromTestDb();

  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const initial =
    props?.initialIds === undefined
      ? undefined
      : {
          id: "existing",
          userId: "user-1",
          name: props.initialName ?? "編集前",
          garmentIds: props.initialIds,
          isAiGenerated: false,
          memo: props.initialMemo,
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        };

  const result = await renderWithProviders(
    <CoordinateBuilder
      initial={initial}
      submitLabel="保存"
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit, ...result };
};

describe("CoordinateBuilder", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navMod.setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("名前と服が両方入っていないと保存ボタンが無効", async () => {
    const user = userEvent.setup();
    await setup();

    const submit = await screen.findByRole("button", { name: "保存" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("コーデ名"), "テスト");
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /服A/, pressed: false }),
    );
    expect(submit).toBeEnabled();
  });

  it("選択中の服を順序入れ替えできる", async () => {
    const user = userEvent.setup();
    await setup({ initialIds: ["g-1", "g-2"], initialName: "編集前" });

    const moveUpButtons = await screen.findAllByRole("button", {
      name: "上へ",
    });
    expect(moveUpButtons[0]).toBeDisabled();
    const secondMoveUp = moveUpButtons[1];
    expect(secondMoveUp).toBeDefined();
    if (secondMoveUp === undefined) return;
    const selectedList = secondMoveUp.closest("ul");
    expect(selectedList).not.toBeNull();
    if (selectedList === null) return;
    await user.click(secondMoveUp);

    const items = within(selectedList).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("服B");
    expect(items[1]).toHaveTextContent("服A");
  });

  it("選択中の服を削除できる", async () => {
    const user = userEvent.setup();
    await setup({ initialIds: ["g-1", "g-2"], initialName: "編集前" });

    const removeButtons = await screen.findAllByRole("button", {
      name: "削除",
    });
    expect(removeButtons).toHaveLength(2);
    const firstRemove = removeButtons[0];
    expect(firstRemove).toBeDefined();
    if (firstRemove === undefined) return;
    await user.click(firstRemove);

    expect(await screen.findAllByRole("button", { name: "削除" })).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("button", { name: /服B/, pressed: true }),
    ).toBeInTheDocument();
  });

  it("検索で服を絞り込める", async () => {
    const user = userEvent.setup();
    await setup();

    await user.type(
      await screen.findByPlaceholderText("名前やタグで検索..."),
      "フォーマル",
    );

    expect(
      screen.getByRole("button", { name: /服C/, pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /服A/ }),
    ).not.toBeInTheDocument();
  });

  it("保存時に submitLabel と現在の入力で onSubmit が呼ばれる", async () => {
    const user = userEvent.setup();
    const { onSubmit } = await setup();

    await user.click(
      await screen.findByRole("button", { name: /服A/, pressed: false }),
    );
    await user.type(screen.getByLabelText("コーデ名"), "コーデ");
    await user.type(screen.getByLabelText("メモ"), "メモ内容");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "コーデ",
      memo: "メモ内容",
      garmentIds: ["g-1"],
    });
  });
});
