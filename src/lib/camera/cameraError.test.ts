import { describe, it, expect } from "vitest";
import { classifyCameraError } from "./cameraError";

describe("classifyCameraError", () => {
  it.each([
    ["NotAllowedError", "permission_denied"],
    ["PermissionDeniedError", "permission_denied"],
    ["SecurityError", "permission_denied"],
    ["NotFoundError", "not_found"],
    ["DevicesNotFoundError", "not_found"],
    ["OverconstrainedError", "not_found"],
    ["ConstraintNotSatisfiedError", "not_found"],
    ["NotReadableError", "in_use"],
    ["TrackStartError", "in_use"],
    ["NotSupportedError", "unsupported"],
  ])("DOMException %s を %s に分類する", (name, expected) => {
    expect(classifyCameraError(new DOMException("failed", name))).toBe(
      expected,
    );
  });

  it("未知の name は unknown に分類する", () => {
    expect(classifyCameraError(new DOMException("failed", "WeirdError"))).toBe(
      "unknown",
    );
  });

  it("name を持たない値は unknown に分類する", () => {
    expect(classifyCameraError({ message: "failed" })).toBe("unknown");
  });

  it("name が文字列でない場合は unknown に分類する", () => {
    expect(classifyCameraError({ name: 42 })).toBe("unknown");
  });

  it("null は unknown に分類する", () => {
    expect(classifyCameraError(null)).toBe("unknown");
  });

  it("プリミティブは unknown に分類する", () => {
    expect(classifyCameraError("NotAllowedError")).toBe("unknown");
  });
});
