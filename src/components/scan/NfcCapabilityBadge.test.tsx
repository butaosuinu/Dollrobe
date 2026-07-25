import { describe, it, expect, vi, aroundEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { setNfcSupported } from "@/test/helpers/nfc";
import NfcCapabilityBadge from "./NfcCapabilityBadge";

describe("NfcCapabilityBadge", () => {
  aroundEach(async (runTest) => {
    setNfcSupported(false);

    await runTest();

    vi.restoreAllMocks();
  });

  it("NFC 対応時に「NFC 対応」と表示される", async () => {
    setNfcSupported(true);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(await screen.findByText("NFC 対応")).toBeInTheDocument();
  });

  it("NFC 非対応時に「NFC 非対応」と表示される", async () => {
    setNfcSupported(false);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(await screen.findByText("NFC 非対応")).toBeInTheDocument();
  });
});
