import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { generateQrDataUrl } from "@/lib/qr/generate";

type QrKey = {
  readonly type: "garment" | "location";
  readonly id: string;
};

export const qrDataUrlAtom = atomFamily(
  ({ type, id }: QrKey) =>
    atom(async () => await generateQrDataUrl({ type, id })),
  (a: QrKey, b: QrKey) => a.type === b.type && a.id === b.id,
);
