import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;
const MARKETING_NETWORK_TIMEOUT_SECONDS = 5;

// LP / 認証フォームは内容が変わりやすいので NetworkFirst。
// オフラインでも前回のキャッシュにフォールバック可能
const PUBLIC_NAVIGATION_PATHS = Object.freeze(["/", "/signin", "/signup"]);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) =>
        request.mode === "navigate" &&
        PUBLIC_NAVIGATION_PATHS.includes(url.pathname),
      handler: new NetworkFirst({
        cacheName: "marketing-pages",
        networkTimeoutSeconds: MARKETING_NETWORK_TIMEOUT_SECONDS,
      }),
    },
    {
      matcher: ({ url }) => url.pathname.endsWith(".wasm"),
      handler: new CacheFirst({
        cacheName: "wasm-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: THIRTY_DAYS_IN_SECONDS,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
