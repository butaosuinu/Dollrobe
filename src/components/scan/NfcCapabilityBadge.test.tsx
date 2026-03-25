import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import NfcCapabilityBadge from "./NfcCapabilityBadge";

const mockIsNfcSupported = vi.hoisted(() => vi.fn<() => boolean>());

vi.mock("@/lib/nfc/capability", () => ({
  isNfcSupported: mockIsNfcSupported,
}));

describe("NfcCapabilityBadge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NFC 対応時に「NFC 対応」と表示される", async () => {
    mockIsNfcSupported.mockReturnValue(true);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(screen.getByText("NFC 対応")).toBeInTheDocument();
  });

  it("NFC 非対応時に「NFC 非対応」と表示される", async () => {
    mockIsNfcSupported.mockReturnValue(false);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(screen.getByText("NFC 非対応")).toBeInTheDocument();
  });
});
