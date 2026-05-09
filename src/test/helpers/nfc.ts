import { vi } from "vitest";
import * as nfcCapability from "@/lib/nfc/capability";

export const setNfcSupported = (supported: boolean): void => {
  vi.spyOn(nfcCapability, "isNfcSupported").mockReturnValue(supported);
};
