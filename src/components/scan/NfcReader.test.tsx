import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import type { NfcReaderState } from "@/hooks/useNfcReader";
import NfcReader from "./NfcReader";

describe("NfcReader", () => {
  it("scanning 状態で「NFC 待ち受け中...」が表示される", async () => {
    const state: NfcReaderState = { status: "scanning" };
    await renderWithProviders(<NfcReader nfcState={state} />);

    expect(screen.getByText("NFC 待ち受け中...")).toBeInTheDocument();
  });

  it("idle 状態で何も表示されない", async () => {
    const state: NfcReaderState = { status: "idle" };
    const { container } = await renderWithProviders(
      <NfcReader nfcState={state} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("unsupported 状態で何も表示されない", async () => {
    const state: NfcReaderState = { status: "unsupported" };
    const { container } = await renderWithProviders(
      <NfcReader nfcState={state} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("permission_denied 状態でメッセージが表示される", async () => {
    const state: NfcReaderState = { status: "permission_denied" };
    await renderWithProviders(<NfcReader nfcState={state} />);

    expect(screen.getByText("NFC の権限が拒否されました")).toBeInTheDocument();
  });

  it("error 状態でエラーメッセージが表示される", async () => {
    const state: NfcReaderState = {
      status: "error",
      message: "NFC読み取りに失敗しました",
    };
    await renderWithProviders(<NfcReader nfcState={state} />);

    expect(screen.getByText("NFC読み取りに失敗しました")).toBeInTheDocument();
  });
});
