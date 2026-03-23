/* eslint-disable functional/no-mixed-types, functional/no-classes, functional/no-class-inheritance, functional/no-return-void, @typescript-eslint/method-signature-style -- Web NFC API の ambient 型定義。ブラウザ API の形状をそのまま宣言するためクラス・メソッド等を許可する */

type NDEFRecordInit = {
  readonly recordType: string;
  readonly mediaType?: string;
  readonly id?: string;
  readonly encoding?: string;
  readonly lang?: string;
  readonly data?: string | BufferSource;
};

type NDEFMessageInit = {
  readonly records: readonly NDEFRecordInit[];
};

type NDEFRecord = {
  readonly recordType: string;
  readonly mediaType: string;
  readonly id: string;
  readonly encoding: string;
  readonly lang: string;
  readonly data: DataView | undefined;
  toRecords(): readonly NDEFRecord[];
};

type NDEFMessage = {
  readonly records: readonly NDEFRecord[];
};

interface NDEFReadingEvent extends Event {
  readonly serialNumber: string;
  readonly message: NDEFMessage;
}

type NDEFScanOptions = {
  readonly signal?: AbortSignal;
};

type NDEFWriteOptions = {
  readonly overwrite?: boolean;
  readonly signal?: AbortSignal;
};

type NDEFMessageSource = string | BufferSource | NDEFMessageInit;

declare global {
  class NDEFReader extends EventTarget {
    constructor();
    scan(options?: NDEFScanOptions): Promise<void>;
    write(
      message: NDEFMessageSource,
      options?: NDEFWriteOptions,
    ): Promise<void>;
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
}

export {};
