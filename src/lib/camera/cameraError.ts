export type CameraErrorKind =
  | "permission_denied"
  | "not_found"
  | "in_use"
  | "unsupported"
  | "unknown";

const KIND_BY_ERROR_NAME: Readonly<Record<string, CameraErrorKind>> =
  Object.freeze({
    NotAllowedError: "permission_denied",
    PermissionDeniedError: "permission_denied",
    SecurityError: "permission_denied",
    NotFoundError: "not_found",
    DevicesNotFoundError: "not_found",
    OverconstrainedError: "not_found",
    ConstraintNotSatisfiedError: "not_found",
    NotReadableError: "in_use",
    TrackStartError: "in_use",
    NotSupportedError: "unsupported",
  });

const getErrorName = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "name" in error
    ? typeof error.name === "string"
      ? error.name
      : undefined
    : undefined;

export const classifyCameraError = (error: unknown): CameraErrorKind => {
  const name = getErrorName(error);
  return name === undefined
    ? "unknown"
    : (KIND_BY_ERROR_NAME[name] ?? "unknown");
};
