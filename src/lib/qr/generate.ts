import QRCode from "qrcode";
import { QR_SCHEME } from "@/lib/constants";

type GenerateQrInput = {
  readonly type: "garment" | "location";
  readonly id: string;
};

const QR_OPTIONS = Object.freeze({
  width: 200,
  margin: 2,
  errorCorrectionLevel: "M" as const,
});

export const generateQrDataUrl = async ({
  type,
  id,
}: GenerateQrInput): Promise<string> => {
  const prefix =
    type === "garment" ? QR_SCHEME.GARMENT_PREFIX : QR_SCHEME.LOCATION_PREFIX;
  return await QRCode.toDataURL(`${prefix}${id}`, QR_OPTIONS);
};

export const generateQrSvgString = async ({
  type,
  id,
}: GenerateQrInput): Promise<string> => {
  const prefix =
    type === "garment" ? QR_SCHEME.GARMENT_PREFIX : QR_SCHEME.LOCATION_PREFIX;
  return await QRCode.toString(`${prefix}${id}`, {
    ...QR_OPTIONS,
    type: "svg",
  });
};
