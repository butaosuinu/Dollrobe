import { QR_SCHEME } from "@/lib/constants";

export type NfcWriteErrorKind =
  | "not_supported"
  | "permission_denied"
  | "write_failed"
  | "aborted";

type NfcWriteSuccess = {
  readonly ok: true;
};

type NfcWriteError = {
  readonly ok: false;
  readonly errorKind: NfcWriteErrorKind;
  readonly message: string;
};

export type NfcWriteResult = NfcWriteSuccess | NfcWriteError;

type BuildNfcSchemeInput = {
  readonly type: "garment" | "location";
  readonly id: string;
};

type WriteNfcTagInput = {
  readonly scheme: string;
  readonly signal?: AbortSignal;
};

export const isNfcSupported = (): boolean =>
  typeof window !== "undefined" && "NDEFReader" in window;

export const buildNfcScheme = ({ type, id }: BuildNfcSchemeInput): string => {
  const prefix =
    type === "garment" ? QR_SCHEME.GARMENT_PREFIX : QR_SCHEME.LOCATION_PREFIX;
  return `${prefix}${id}`;
};

const mapDomExceptionError = (error: DOMException): NfcWriteError =>
  error.name === "NotAllowedError"
    ? { ok: false, errorKind: "permission_denied", message: error.message }
    : error.name === "AbortError"
      ? { ok: false, errorKind: "aborted", message: error.message }
      : { ok: false, errorKind: "write_failed", message: error.message };

const mapWriteError = (error: unknown): NfcWriteError =>
  error instanceof DOMException
    ? mapDomExceptionError(error)
    : {
        ok: false,
        errorKind: "write_failed",
        message:
          error instanceof Error ? error.message : "Unknown NFC write error",
      };

export const writeNfcTag = async ({
  scheme,
  signal,
}: WriteNfcTagInput): Promise<NfcWriteResult> =>
  isNfcSupported()
    ? await new NDEFReader()
        .write([{ recordType: "url", data: scheme }], { signal })
        .then((): NfcWriteResult => ({ ok: true }))
        .catch((error: unknown): NfcWriteResult => mapWriteError(error))
    : {
        ok: false,
        errorKind: "not_supported",
        message: "Web NFC API is not supported on this device",
      };
