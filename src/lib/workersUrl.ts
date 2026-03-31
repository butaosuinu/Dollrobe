const DEFAULT_WORKERS_URL = "http://localhost:8787";

const hasExplicitUrl =
  process.env.NEXT_PUBLIC_WORKERS_URL !== undefined &&
  process.env.NEXT_PUBLIC_WORKERS_URL !== "";

export const WORKERS_URL = hasExplicitUrl
  ? process.env.NEXT_PUBLIC_WORKERS_URL
  : DEFAULT_WORKERS_URL;

export const WORKERS_URL_FOR_FETCH = hasExplicitUrl
  ? process.env.NEXT_PUBLIC_WORKERS_URL
  : typeof window === "undefined"
    ? DEFAULT_WORKERS_URL
    : "";
