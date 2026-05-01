import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { MS_PER_DAY } from "@/lib/constants";
import { testDb, FIXED_NOW } from "@/test/mocks/db";
import { seedDbFromTestDb } from "@/test/helpers/seedDb";
import { renderWithProviders } from "@/test/testUtils";
import ArchivePage from "./page";

const navMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/nextLink"),
);
vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);

describe("ArchivePage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    navMod.setupNextNavigation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ページタイトル「アーカイブ」が表示される", async () => {
    await renderWithProviders(<ArchivePage />);
    expect(await screen.findByText("アーカイブ")).toBeInTheDocument();
  });

  it("戻るリンクが /garments を指している", async () => {
    await renderWithProviders(<ArchivePage />);
    const links = screen.getAllByRole("link");
    const backLink = links.find(
      (link) => link.getAttribute("href") === "/garments",
    );
    expect(backLink).toBeDefined();
  });

  it("アーカイブ済み服がない場合に空状態を表示する", async () => {
    await renderWithProviders(<ArchivePage />);
    expect(await screen.findByText("アーカイブは空です")).toBeInTheDocument();
    expect(
      screen.getByText("アーカイブした服はここに表示されます"),
    ).toBeInTheDocument();
  });

  it("アーカイブ済みドールがない場合に空状態を表示する", async () => {
    navMod.setupNextNavigation({
      searchParams: new URLSearchParams("tab=doll"),
    });
    await renderWithProviders(<ArchivePage />);
    expect(await screen.findByText("アーカイブは空です")).toBeInTheDocument();
    expect(
      screen.getByText("アーカイブしたドールはここに表示されます"),
    ).toBeInTheDocument();
  });

  it("アーカイブ済みの服がグリッドに表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "黒いコート",
      archivedAt: FIXED_NOW - 2 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("白いドレス")).toBeInTheDocument();
    expect(screen.getByText("黒いコート")).toBeInTheDocument();
  });

  it("アーカイブ済みのドールがグリッドに表示される", async () => {
    navMod.setupNextNavigation({
      searchParams: new URLSearchParams("tab=doll"),
    });
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.doll.create({
      id: "d-2",
      name: "ミユ",
      archivedAt: FIXED_NOW - 2 * MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("リナ")).toBeInTheDocument();
    expect(screen.getByText("ミユ")).toBeInTheDocument();
  });

  it("アーカイブされていないアイテムは表示されない", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "アーカイブ済みドレス",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.garment.create({ id: "g-2", name: "通常のコート" });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("アーカイブ済みドレス")).toBeInTheDocument();
    expect(screen.queryByText("通常のコート")).not.toBeInTheDocument();
  });

  it("タブに正しい件数が表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "ドレスA",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "ドレスB",
      archivedAt: FIXED_NOW - 2 * MS_PER_DAY,
    });
    testDb.garment.create({ id: "g-3", name: "通常の服" });
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("服 (2)")).toBeInTheDocument();
    expect(screen.getByText("ドール (1)")).toBeInTheDocument();
  });

  it("ドールタブではドールのみ表示され服は表示されない", async () => {
    navMod.setupNextNavigation({
      searchParams: new URLSearchParams("tab=doll"),
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.doll.create({
      id: "d-1",
      name: "リナ",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("リナ")).toBeInTheDocument();
    expect(screen.queryByText("白いドレス")).not.toBeInTheDocument();
  });

  it("アーカイブ日時の降順で表示される", async () => {
    testDb.garment.create({
      id: "g-1",
      name: "古いアーカイブ",
      archivedAt: FIXED_NOW - 10 * MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-2",
      name: "新しいアーカイブ",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    testDb.garment.create({
      id: "g-3",
      name: "最新アーカイブ",
      archivedAt: FIXED_NOW,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    await screen.findByText("最新アーカイブ");
    const garmentNames = screen
      .getAllByText(/^(?:古いアーカイブ|新しいアーカイブ|最新アーカイブ)$/)
      .map((el) => el.textContent);
    expect(garmentNames[0]).toBe("最新アーカイブ");
    expect(garmentNames[1]).toBe("新しいアーカイブ");
    expect(garmentNames[2]).toBe("古いアーカイブ");
  });

  it("無効なタブパラメータの場合は服タブがデフォルトになる", async () => {
    navMod.setupNextNavigation({
      searchParams: new URLSearchParams("tab=invalid"),
    });
    testDb.garment.create({
      id: "g-1",
      name: "白いドレス",
      archivedAt: FIXED_NOW - MS_PER_DAY,
    });
    await seedDbFromTestDb();

    await renderWithProviders(<ArchivePage />);

    expect(await screen.findByText("白いドレス")).toBeInTheDocument();
  });
});
