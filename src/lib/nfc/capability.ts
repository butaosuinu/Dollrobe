export const isNfcSupported = (): boolean =>
  typeof window !== "undefined" && "NDEFReader" in window;
