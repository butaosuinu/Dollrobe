import { test as base, type Page } from "@playwright/test";
import { seedIndexedDB, type SeedData } from "./seed";

const SESSION_RESPONSE = {
  user: {
    id: "temp-user-001",
    name: "E2E テストユーザー",
    email: "e2e@test.local",
    image: null,
    emailVerified: false,
    createdAt: new Date("2025-06-15T00:00:00Z").toISOString(),
    updatedAt: new Date("2025-06-15T00:00:00Z").toISOString(),
  },
};

type TestFixtures = {
  readonly authedPage: Page;
  readonly seed: (data: SeedData) => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  authedPage: async ({ page }, use) => {
    // Next.js dev overlay 除去（ハイドレーションミスマッチのオーバーレイが
    // getByText のstrict mode violationを起こすため）
    await page.addInitScript(() => {
      const isNextjsOverlay = (el: HTMLElement): boolean =>
        el.tagName.toLowerCase() === "nextjs-portal" ||
        el.hasAttribute("data-nextjs-container-errors-pseudo-html");
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement && isNextjsOverlay(node)) {
              node.remove();
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    });

    // QR スキャンシミュレーション基盤
    await page.addInitScript(() => {
      // getUserMedia: ヘッドレスでカメラ不可のため空ストリームを返す
      navigator.mediaDevices.getUserMedia = async () => new MediaStream();

      // video.play() パッチ: readyState チェックをバイパスするため
      // インスタンスの HAVE_ENOUGH_DATA を readyState(0) に合わせる
      const origPlay = HTMLVideoElement.prototype.play;
      HTMLVideoElement.prototype.play = function () {
        try {
          Object.defineProperty(this, "HAVE_ENOUGH_DATA", {
            value: 0,
            configurable: true,
          });
          Object.defineProperty(this, "videoWidth", {
            value: 640,
            configurable: true,
          });
          Object.defineProperty(this, "videoHeight", {
            value: 480,
            configurable: true,
          });
        } catch {
          /* ignore */
        }
        return origPlay.call(this).catch(() => undefined) as Promise<undefined>;
      };

      // getImageData インターセプト: pending QR 画像を注入
      let pendingQr:
        | { width: number; height: number; data: number[] }
        | undefined;

      (window as unknown as Record<string, unknown>).__setPendingQrScan = (px: {
        width: number;
        height: number;
        data: number[];
      }) => {
        pendingQr = px;
      };

      const origGID = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (
        sx: number,
        sy: number,
        sw: number,
        sh: number,
      ): ImageData {
        if (pendingQr === undefined) {
          return origGID.call(this, sx, sy, sw, sh);
        }
        const qr = pendingQr;
        pendingQr = undefined;

        const src = document.createElement("canvas");
        src.width = qr.width;
        src.height = qr.height;
        src
          .getContext("2d")!
          .putImageData(
            new ImageData(new Uint8ClampedArray(qr.data), qr.width, qr.height),
            0,
            0,
          );

        const tmp = document.createElement("canvas");
        tmp.width = sw;
        tmp.height = sh;
        const ctx = tmp.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sw, sh);
        const scale = Math.min(sw / qr.width, sh / qr.height) * 0.8;
        const dx = (sw - qr.width * scale) / 2;
        const dy = (sh - qr.height * scale) / 2;
        ctx.drawImage(src, dx, dy, qr.width * scale, qr.height * scale);
        return origGID.call(ctx, 0, 0, sw, sh);
      };
    });

    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SESSION_RESPONSE),
      }),
    );

    await page.route("**/trpc/sync.pull**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: null } }),
      }),
    );

    await page.route("**/trpc/sync.push**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: { ok: true } } }),
      }),
    );

    await use(page);
  },

  seed: async ({ authedPage }, use) => {
    await authedPage.goto("/");
    await authedPage.getByText("おかえりなさい").waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const seedFn = async (data: SeedData): Promise<void> => {
      await seedIndexedDB(authedPage, data);
    };

    await use(seedFn);
  },
});
