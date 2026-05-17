import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { trpcMutation } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import UserFreezeButton from "./UserFreezeButton";

describe("UserFreezeButton", () => {
  beforeEach(() => {
    setupNextNavigation({ pathname: "/admin/users/u-target" });
  });

  it("disabled を渡さない場合は デフォルト false としてボタンが押せる", async () => {
    await renderWithProviders(
      <UserFreezeButton targetUserId="u-target" frozen={false} />,
    );

    expect(screen.getByRole("button", { name: /凍結する/ })).toBeEnabled();
  });

  it("disabled=false のとき disabledReason を渡しても補足文は表示されない", async () => {
    await renderWithProviders(
      <UserFreezeButton
        targetUserId="u-target"
        frozen={false}
        disabled={false}
        disabledReason="表示されないはず"
      />,
    );

    expect(screen.queryByText("表示されないはず")).not.toBeInTheDocument();
  });

  it("disabled=true で disabledReason を渡すと補足文が表示され、ボタンは押せない", async () => {
    await renderWithProviders(
      <UserFreezeButton
        targetUserId="u-target"
        frozen={false}
        disabled={true}
        disabledReason="自分自身は凍結できません"
      />,
    );

    expect(screen.getByText("自分自身は凍結できません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /凍結する/ })).toBeDisabled();
  });

  it("disabled=true で disabledReason が未指定だと補足文は出ない", async () => {
    await renderWithProviders(
      <UserFreezeButton targetUserId="u-target" frozen={false} disabled />,
    );

    expect(
      screen.queryByText("自分自身は凍結できません"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /凍結する/ })).toBeDisabled();
  });

  it("ConfirmSheet で キャンセル を押すと mutation は呼ばれない", async () => {
    const user = userEvent.setup();
    const callRef: { current: boolean } = { current: false };
    server.use(
      trpcMutation("admin.users.freeze", () => {
        callRef.current = true;
        return { ok: true as const, noop: false };
      }),
    );

    await renderWithProviders(
      <UserFreezeButton targetUserId="u-target" frozen={false} />,
    );

    await user.click(screen.getByRole("button", { name: /凍結する/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "キャンセル" }),
    );

    // dialog が閉じる
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(callRef.current).toBe(false);
  });

  it("frozen=true の場合は 解凍する ラベルと message が出る", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <UserFreezeButton targetUserId="u-target" frozen={true} />,
    );

    await user.click(screen.getByRole("button", { name: /解凍する/ }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("このユーザーを解凍しますか？"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "解凍すると再びログインできるようになります。データは保持されます。",
      ),
    ).toBeInTheDocument();
  });
});
