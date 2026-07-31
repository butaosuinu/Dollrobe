import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { testDb } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { setupNextNavigation } from "@/test/mocks/modules/nextNavigation";
import { renderWithProviders } from "@/test/testUtils";
import PrintPage from "./page";

describe("PrintPage", () => {
  beforeEach(() => {
    setupNextNavigation();
  });

  it("パラメータなしで「選択されていません」メッセージが表示される", async () => {
    await renderWithProviders(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });

  it("type と ids が指定されたら QR ラベルが表示される", async () => {
    testDb.garment.create({ id: "g1", name: "ドレスA" });
    testDb.garment.create({ id: "g2", name: "ドレスB" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams(
        "type=garment&ids=g1&ids=g2&names=ドレスA&names=ドレスB",
      ),
    });
    await renderWithProviders(<PrintPage />);
    expect(screen.getByText("QR ラベル印刷")).toBeInTheDocument();
    expect(screen.getByText("ドレスA")).toBeInTheDocument();
    expect(screen.getByText("ドレスB")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("印刷ボタンが存在する", async () => {
    testDb.garment.create({ id: "g1", name: "テスト" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams("type=garment&ids=g1&names=テスト"),
    });
    await renderWithProviders(<PrintPage />);
    const printButton = screen.getByRole("button", { name: /印刷/ });
    expect(printButton).toBeInTheDocument();
    expect(printButton).toBeEnabled();
  });

  it("names が指定されていない場合は id がラベルに使われる", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams("type=location&ids=loc-1"),
    });
    await renderWithProviders(<PrintPage />);
    expect(screen.getByText("loc-1")).toBeInTheDocument();
  });

  it("無効な type の場合は「選択されていません」が表示される", async () => {
    setupNextNavigation({
      searchParams: new URLSearchParams("type=invalid&ids=g1"),
    });
    await renderWithProviders(<PrintPage />);
    expect(
      screen.getByText("印刷する QR コードが選択されていません"),
    ).toBeInTheDocument();
  });

  it("存在しない服 ID は QR 化されず警告が表示される", async () => {
    testDb.garment.create({ id: "g1", name: "ドレスA" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams(
        "type=garment&ids=invalid-id-12345&names=幻のドレス",
      ),
    });
    await renderWithProviders(<PrintPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登録されていない ID のため印刷対象から除外しました（invalid-id-12345）",
    );
    expect(screen.queryByText("幻のドレス")).not.toBeInTheDocument();
    expect(screen.queryByAltText("QR コード")).not.toBeInTheDocument();
  });

  it("存在する ID と存在しない ID が混在する場合は存在する分だけ QR 化する", async () => {
    testDb.garment.create({ id: "g1", name: "ドレスA" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams(
        "type=garment&ids=g1&ids=ghost&names=ドレスA&names=幻のドレス",
      ),
    });
    await renderWithProviders(<PrintPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登録されていない ID のため印刷対象から除外しました（ghost）",
    );
    expect(screen.getByText("ドレスA")).toBeInTheDocument();
    expect(screen.queryByText("幻のドレス")).not.toBeInTheDocument();
    expect(await screen.findAllByAltText("QR コード")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /印刷/ })).toBeEnabled();
  });

  it("全件が存在しない ID のときは印刷ボタンが disable になる", async () => {
    testDb.garment.create({ id: "g1", name: "ドレスA" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams("type=garment&ids=ghost1&ids=ghost2"),
    });
    await renderWithProviders(<PrintPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登録されていない ID のため印刷対象から除外しました（ghost1, ghost2）",
    );
    expect(
      screen.getByText("印刷できる QR コードがありません"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /印刷/ })).toBeDisabled();
  });

  it("存在しない収納場所 ID も QR 化されず警告が表示される", async () => {
    testDb.storageLocation.create({ id: "loc-1", label: "A-1" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams(
        "type=location&ids=loc-1&ids=ghost-loc&names=A-1&names=幻の場所",
      ),
    });
    await renderWithProviders(<PrintPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登録されていない ID のため印刷対象から除外しました（ghost-loc）",
    );
    expect(screen.getByText("A-1")).toBeInTheDocument();
    expect(screen.queryByText("幻の場所")).not.toBeInTheDocument();
  });

  it("他ユーザーの服 ID は存在しない扱いになる", async () => {
    testDb.garment.create({ id: "g1", name: "ドレスA", userId: "user-2" });
    await seedDbFromTestDb();
    setupNextNavigation({
      searchParams: new URLSearchParams("type=garment&ids=g1&names=ドレスA"),
    });
    await renderWithProviders(<PrintPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登録されていない ID のため印刷対象から除外しました（g1）",
    );
    expect(screen.getByRole("button", { name: /印刷/ })).toBeDisabled();
  });
});
