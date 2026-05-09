import {
  createGarment,
  createDoll,
  createStorageCase,
  createStorageLocation,
  FIXED_NOW,
} from "../e2e/fixtures/factories";
import type { SeedData } from "../e2e/fixtures/seed";

const DAY = 86_400_000;

const RECENT_SCAN = FIXED_NOW - 2 * DAY;
const STALE_SCAN = FIXED_NOW - 25 * DAY;
const VERY_STALE_SCAN = FIXED_NOW - 45 * DAY;

export const buildSeedForScreenshots = (): SeedData => {
  const dolls = [
    createDoll({
      id: "lp-doll-sd",
      name: "Sakura",
      bodySize: "SD",
      maker: "Volks",
    }),
    createDoll({
      id: "lp-doll-msd",
      name: "Mint",
      bodySize: "MSD",
      maker: "Volks",
    }),
    createDoll({
      id: "lp-doll-dd",
      name: "Rin",
      bodySize: "DD",
      maker: "Volks",
    }),
  ];

  const storageCases = [
    createStorageCase({
      id: "lp-case-a",
      name: "衣装ケース A",
      rows: 3,
      cols: 3,
    }),
    createStorageCase({
      id: "lp-case-b",
      name: "衣装ケース B",
      rows: 2,
      cols: 3,
    }),
  ];

  const storageLocations = [
    ...Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return createStorageLocation({
        id: `lp-loc-a-${i}`,
        caseId: "lp-case-a",
        label: `A-${row + 1}-${col + 1}`,
        row,
        col,
        lastVisitedAt: RECENT_SCAN,
      });
    }),
    ...Array.from({ length: 6 }, (_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return createStorageLocation({
        id: `lp-loc-b-${i}`,
        caseId: "lp-case-b",
        label: `B-${row + 1}-${col + 1}`,
        row,
        col,
        lastVisitedAt: RECENT_SCAN,
      });
    }),
  ];

  const garments = [
    createGarment({
      id: "lp-g-1",
      name: "ロリータワンピース（ピンク）",
      category: "onepiece",
      dollSizes: ["SD"],
      colors: ["hsl(350 65% 75%)"],
      tags: ["ロリータ", "ピンク"],
      locationId: "lp-loc-a-0",
      lastScannedAt: RECENT_SCAN,
      brand: "Angelic Pretty",
    }),
    createGarment({
      id: "lp-g-2",
      name: "セーラーワンピース",
      category: "onepiece",
      dollSizes: ["SD"],
      colors: ["hsl(220 55% 55%)", "hsl(0 0% 95%)"],
      tags: ["制服"],
      locationId: "lp-loc-a-1",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-3",
      name: "ゴシックドレス（黒）",
      category: "dress",
      dollSizes: ["SD", "DD"],
      colors: ["hsl(280 15% 15%)"],
      tags: ["ゴシック", "フォーマル"],
      locationId: "lp-loc-a-2",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-4",
      name: "ニットセーター",
      category: "tops",
      dollSizes: ["MSD"],
      colors: ["hsl(30 55% 70%)"],
      tags: ["カジュアル", "秋冬"],
      locationId: "lp-loc-a-3",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-5",
      name: "プリーツスカート",
      category: "bottoms",
      dollSizes: ["MSD"],
      colors: ["hsl(220 20% 30%)"],
      tags: ["制服"],
      locationId: "lp-loc-a-4",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-6",
      name: "シフォンブラウス",
      category: "tops",
      dollSizes: ["SD"],
      colors: ["hsl(0 0% 95%)"],
      tags: ["フォーマル"],
      locationId: "lp-loc-a-5",
      lastScannedAt: STALE_SCAN,
    }),
    createGarment({
      id: "lp-g-7",
      name: "デニムジャケット",
      category: "outer",
      dollSizes: ["DD"],
      colors: ["hsl(220 40% 50%)"],
      tags: ["カジュアル"],
      locationId: "lp-loc-a-6",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-8",
      name: "編み上げブーツ",
      category: "shoes",
      dollSizes: ["SD"],
      colors: ["hsl(25 40% 25%)"],
      tags: ["ゴシック"],
      locationId: "lp-loc-b-0",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-9",
      name: "ふわふわベレー帽",
      category: "hat",
      dollSizes: ["MSD"],
      colors: ["hsl(330 45% 75%)"],
      tags: ["カジュアル"],
      locationId: "lp-loc-b-1",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-10",
      name: "リボンカチューシャ",
      category: "accessory",
      dollSizes: ["SD", "MSD"],
      colors: ["hsl(350 65% 75%)"],
      tags: ["ロリータ"],
      locationId: "lp-loc-b-2",
      lastScannedAt: RECENT_SCAN,
    }),
    createGarment({
      id: "lp-g-11",
      name: "花柄ワンピース",
      category: "onepiece",
      dollSizes: ["MSD"],
      colors: ["hsl(350 60% 80%)", "hsl(140 30% 60%)"],
      tags: ["春夏", "カジュアル"],
      locationId: "lp-loc-b-3",
      lastScannedAt: VERY_STALE_SCAN,
    }),
    createGarment({
      id: "lp-g-12",
      name: "パーティドレス",
      category: "dress",
      dollSizes: ["DD"],
      colors: ["hsl(340 60% 40%)"],
      tags: ["フォーマル"],
      locationId: undefined,
      status: "checked_out",
      checkedOutAt: FIXED_NOW - 5 * DAY,
      lastScannedAt: FIXED_NOW - 5 * DAY,
    }),
  ];

  return { dolls, storageCases, storageLocations, garments };
};
