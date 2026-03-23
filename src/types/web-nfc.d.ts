/* eslint-disable functional/no-mixed-types, functional/no-classes, functional/no-class-inheritance, functional/no-return-void, @typescript-eslint/method-signature-style -- Web NFC API の ambient 型定義。ブラウザ API の形状をそのまま宣言するためクラス・メソッド等を許可する */

type NDEFRecord = {
  readonly recordType: string;
  readonly mediaType?: string;
  readonly id?: string;
  readonly data?: DataView;
  readonly encoding?: string;
  readonly lang?: string;
  toJSON(): Record<string, unknown>;
};

type NDEFMessage = {
  readonly records: readonly NDEFRecord[];
};

type NDEFReadingEvent = Event & {
  readonly serialNumber: string;
  readonly message: NDEFMessage;
};

declare class NDEFReader extends EventTarget {
  constructor();
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(
    type: "reading",
    listener: (event: NDEFReadingEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: "readingerror",
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

interface Window {
  NDEFReader?: typeof NDEFReader;
}
