import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Digest } from "@/types";
import { renderWithProviders } from "@/test/testUtils";
import DigestCard from "./DigestCard";

const mockMarkRead = vi.hoisted(() => vi.fn());

vi.mock("@/stores/digestAtoms", async () => {
  const { atom: jotaiAtom } =
    await vi.importActual<typeof import("jotai")>("jotai");
  return {
    markDigestReadAtom: jotaiAtom(undefined, (_get, _set, id: string) => {
      mockMarkRead(id);
    }),
  };
});

const FIXED_TIMESTAMP = new Date("2026-04-01T00:00:00Z").getTime();

const createTestDigest = (overrides: Partial<Digest> = {}): Digest => ({
  id: "digest-1",
  userId: "user-1",
  accuracyScore: 0.85,
  confirmedCount: 12,
  uncertainCount: 5,
  unknownCount: 3,
  totalGarments: 20,
  isRead: false,
  generatedAt: FIXED_TIMESTAMP,
  createdAt: FIXED_TIMESTAMP,
  ...overrides,
});

describe("DigestCard", () => {
  beforeEach(() => {
    mockMarkRead.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未読時は「未読」バッジと既読化ボタンが表示される", async () => {
    await renderWithProviders(<DigestCard digest={createTestDigest()} />);

    expect(screen.getByText("未読")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "既読にする" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("既読時は「未読」バッジが非表示で、ボタンが無効化される", async () => {
    await renderWithProviders(
      <DigestCard digest={createTestDigest({ isRead: true })} />,
    );

    expect(screen.queryByText("未読")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "既読済み" });
    expect(button).toBeDisabled();
  });

  it("未読ボタンを押すと markRead が digest id で呼ばれる", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <DigestCard digest={createTestDigest({ id: "digest-99" })} />,
    );

    await user.click(screen.getByRole("button", { name: "既読にする" }));

    expect(mockMarkRead).toHaveBeenCalledTimes(1);
    expect(mockMarkRead).toHaveBeenCalledWith("digest-99");
  });

  it("既読時にボタンを押しても markRead は呼ばれない", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <DigestCard digest={createTestDigest({ isRead: true })} />,
    );

    await user.click(screen.getByRole("button", { name: "既読済み" }));

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("accuracyScore がパーセント表示される", async () => {
    await renderWithProviders(
      <DigestCard digest={createTestDigest({ accuracyScore: 0.756 })} />,
    );

    expect(screen.getByText(/76% 正確/)).toBeInTheDocument();
  });

  it("confirmed/uncertain/unknown の 3 種カウントと総数が表示される", async () => {
    await renderWithProviders(
      <DigestCard
        digest={createTestDigest({
          confirmedCount: 42,
          uncertainCount: 7,
          unknownCount: 2,
          totalGarments: 51,
        })}
      />,
    );

    expect(screen.getByText("確定")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("要確認")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("不明")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/管理中の服: 51着/)).toBeInTheDocument();
  });
});
