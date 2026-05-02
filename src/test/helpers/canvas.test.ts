import { describe, expect, it } from "vitest";
import {
  installCanvas2DContext,
  installVideoReadyState,
  restoreCanvasMocks,
} from "./canvas";

const HAVE_ENOUGH_DATA = 4;
const NOT_ENOUGH_DATA = 2;

describe("canvas helper restore", () => {
  it("同じプロパティを複数回 install しても restore で true original へ戻る", () => {
    const originalReadyState = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "readyState",
    );

    installVideoReadyState(HAVE_ENOUGH_DATA, HAVE_ENOUGH_DATA);
    installVideoReadyState(NOT_ENOUGH_DATA, HAVE_ENOUGH_DATA);

    restoreCanvasMocks();

    const after = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "readyState",
    );
    expect(after).toEqual(originalReadyState);
  });

  it("Canvas getContext の install/restore も同様に true original へ戻る", () => {
    const originalGetContext = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
    );

    installCanvas2DContext();
    installCanvas2DContext();

    restoreCanvasMocks();

    const after = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
    );
    expect(after).toEqual(originalGetContext);
  });
});
