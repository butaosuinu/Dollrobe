import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import NfcCapabilityBadge from "./NfcCapabilityBadge";

const nfcSupMod = await vi.hoisted(
  async () => await import("@/test/mocks/modules/useNfcSupported"),
);
vi.mock("@/hooks/useNfcSupported", nfcSupMod.useNfcSupportedFactory);

const nfcSupHandle: {
  current: ReturnType<typeof nfcSupMod.setupUseNfcSupported>;
} = {
  current: nfcSupMod.setupUseNfcSupported(),
};

describe("NfcCapabilityBadge", () => {
  beforeEach(() => {
    nfcSupHandle.current = nfcSupMod.setupUseNfcSupported(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("NFC 対応時に「NFC 対応」と表示される", async () => {
    nfcSupHandle.current.setSupported(true);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(screen.getByText("NFC 対応")).toBeInTheDocument();
  });

  it("NFC 非対応時に「NFC 非対応」と表示される", async () => {
    nfcSupHandle.current.setSupported(false);
    await renderWithProviders(<NfcCapabilityBadge />);

    expect(screen.getByText("NFC 非対応")).toBeInTheDocument();
  });
});
