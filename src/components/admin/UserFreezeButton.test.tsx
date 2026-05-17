import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server";
import { trpcMutation } from "@/test/mocks/trpc/handlerFactory";
import { renderWithProviders } from "@/test/testUtils";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import ToastContainer from "@/components/ui/Toast";
import UserFreezeButton from "./UserFreezeButton";

// Toast は本番では AppShell 配下で描画されるため、テストでも一緒に mount しないと
// addToast が atom を更新しても画面に出ない。
const WithToast = ({ children }: { readonly children: React.ReactNode }) => (
  <>
    {children}
    <ToastContainer />
  </>
);

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
    const resolver = vi.fn(() => ({ ok: true as const, noop: false }));
    server.use(trpcMutation("admin.users.freeze", resolver));

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
    expect(resolver).not.toHaveBeenCalled();
  });

  it("freeze mutation が reject されたとき toast でエラーを表示する", async () => {
    const user = userEvent.setup();
    server.use(
      trpcMutation(
        "admin.users.freeze",
        async () => await Promise.reject(new Error("FORBIDDEN: admin->admin")),
      ),
    );

    await renderWithProviders(
      <WithToast>
        <UserFreezeButton targetUserId="u-target" frozen={false} />
      </WithToast>,
    );

    await user.click(screen.getByRole("button", { name: /凍結する/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "凍結する" }));

    expect(
      await screen.findByText(
        "凍結に失敗しました。時間をおいて再度お試しください",
      ),
    ).toBeInTheDocument();
  });

  it("unfreeze mutation が reject されたとき 解凍失敗 toast を表示する", async () => {
    const user = userEvent.setup();
    server.use(
      trpcMutation(
        "admin.users.unfreeze",
        async () => await Promise.reject(new Error("INTERNAL_ERROR")),
      ),
    );

    await renderWithProviders(
      <WithToast>
        <UserFreezeButton targetUserId="u-target" frozen={true} />
      </WithToast>,
    );

    await user.click(screen.getByRole("button", { name: /解凍する/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "解凍する" }));

    expect(
      await screen.findByText(
        "解凍に失敗しました。時間をおいて再度お試しください",
      ),
    ).toBeInTheDocument();
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
