import type { OpenCV } from "./opencv-loader";
import { extractColorsCore } from "./extract-colors-core";
import type {
  ExtractColorsRequest,
  ExtractColorsResponse,
} from "./extract-colors-types";
import { OPENCV_ASSETS } from "@/lib/constants";

type WorkerCvState = {
  readonly cv?: OpenCV;
};

type WorkerLocation = {
  readonly location: { readonly origin: string };
};

type WorkerImport = {
  readonly importScripts: (...urls: readonly string[]) => void;
};

type WorkerFetch = {
  fetch: typeof fetch;
};

// opencv.js が公開する Emscripten Module の初期化状態。
type OpenCVRunState = {
  readonly calledRun?: boolean;
};

type OpenCVInitHook = {
  onRuntimeInitialized?: () => void;
};

type OpenCVRuntime = OpenCVRunState & OpenCVInitHook;

// thenable な Module を Promise の解決値にしないためのラッパー。
type LoadedOpenCV = {
  readonly cv: OpenCV | undefined;
};

const workerCv: WorkerCvState = self;
const workerLoc: WorkerLocation = self;
const workerImport: WorkerImport = self;
const workerFetch: WorkerFetch = self;

const requestUrlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
};

// opencv.js は wasm のパスを自身の scriptDirectory 基準で解決する。Worker では
// scriptDirectory = self.location.href、つまりバンドラが出力した chunk の URL に
// なるため、public 直下の wasm を /_next/static/chunks/ 配下へ探しに行って 404 する。
// この UMD ビルドは `var Module` でグローバル Module を隠すので Module.locateFile を
// 注入できない。Worker 内の fetch だけを origin 直下へ向け直す。
const redirectWasmRequests = (): void => {
  const originalFetch = workerFetch.fetch.bind(self);
  const wasmUrl = `${workerLoc.location.origin}${OPENCV_ASSETS.WASM_PATH}`;

  workerFetch.fetch = async (input, init) => {
    const url = requestUrlOf(input);
    if (url.endsWith(OPENCV_ASSETS.WASM_PATH) && url !== wasmUrl) {
      return await originalFetch(wasmUrl, init);
    }
    return await originalFetch(input, init);
  };
};

// Module は thenable だが `then(func)` が Module 自身を渡して解決するため、Promise の
// 解決値にすると thenable 解決が無限に再帰してワーカーのイベントループを止める。
// そのため Module は必ず LoadedOpenCV に包んで受け渡し、await は onRuntimeInitialized
// に対して行う。
const waitForRuntimeInitialized = async (): Promise<boolean> => {
  const runtime: OpenCVRuntime | undefined = workerCv.cv;
  if (runtime === undefined) {
    return false;
  }
  if (runtime.calledRun === true) {
    return true;
  }

  const { onRuntimeInitialized: previous } = runtime;
  return await new Promise<boolean>((resolve) => {
    runtime.onRuntimeInitialized = () => {
      previous?.();
      resolve(true);
    };
  });
};

const runtimeReady = (async (): Promise<boolean> => {
  redirectWasmRequests();

  await new Promise<void>((resolve) => {
    workerImport.importScripts(
      `${workerLoc.location.origin}${OPENCV_ASSETS.SCRIPT_PATH}`,
    );
    resolve();
  }).catch(() => undefined);

  return await waitForRuntimeInitialized();
})();

// 初期化には reject 経路が無いのでリクエスト単位でタイムアウトを張る。runtimeReady は
// 使い回すため、低速回線で 1 回目が待ちきれなくても後続のリクエストで復帰できる。
const loadOpencv = async (): Promise<LoadedOpenCV> => {
  const timer: { id: ReturnType<typeof setTimeout> | undefined } = {
    id: undefined,
  };
  const timedOut = new Promise<boolean>((resolve) => {
    timer.id = setTimeout(() => {
      resolve(false);
    }, OPENCV_ASSETS.LOAD_TIMEOUT_MS);
  });

  const ready = await Promise.race([runtimeReady, timedOut]);
  clearTimeout(timer.id);

  return { cv: ready ? workerCv.cv : undefined };
};

self.addEventListener(
  "message",
  (event: MessageEvent<ExtractColorsRequest>) => {
    const { data } = event;

    const run = async (): Promise<void> => {
      const { cv } = await loadOpencv();
      if (cv === undefined) {
        const response: ExtractColorsResponse = {
          type: "error",
          message: "OpenCV.js failed to load",
        };
        self.postMessage(response);
        return;
      }

      const result = await extractColorsCore({
        file: data.file,
        cv,
      }).catch((error: unknown) => {
        const response: ExtractColorsResponse = {
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(response);
        return undefined;
      });
      if (result === undefined) {
        return;
      }
      const response: ExtractColorsResponse = {
        type: "result",
        presetColors: [...result.presetColors],
      };
      self.postMessage(response);
    };

    void run();
  },
);
