import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import * as nfcCapability from "@/lib/nfc/capability";
import NfcCapabilityBadge from "./NfcCapabilityBadge";

describe("NfcCapabilityBadge", () => {
  beforeEach(() => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NFC 対応時に「NFC 対応」と表示される", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(true);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(await screen.findByText("NFC 対応")).toBeInTheDocument();
  });

  it("NFC 非対応時に「NFC 非対応」と表示される", async () => {
    vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(false);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(await screen.findByText("NFC 非対応")).toBeInTheDocument();
  });
});
