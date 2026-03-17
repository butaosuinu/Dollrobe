import { env } from "cloudflare:test";
import {
  createTestCaller,
  resetDatabase,
  createTestGarmentInput,
  getTestDb,
} from "./helpers";

const R2_PUBLIC_URL = "https://test.example.com";

describe("画像アップロード シナリオ", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("garment 削除時の R2 クリーンアップ", () => {
    it("imageUrl 付き garment を削除すると R2 オブジェクトも削除される", async () => {
      const caller = getCaller();
      const bucket = env.BUCKET;

      const key = "garments/temp-user-001/test-garment/123.png";
      await bucket.put(key, new ArrayBuffer(100), {
        httpMetadata: { contentType: "image/png" },
      });

      const objectBefore = await bucket.head(key);
      expect(objectBefore).not.toBeNull();

      const imageUrl = `${R2_PUBLIC_URL}/${key}`;
      const garment = await caller.garment.create(
        createTestGarmentInput({ imageUrl }),
      );

      await caller.garment.delete({ id: garment.id });

      const objectAfter = await bucket.head(key);
      expect(objectAfter).toBeNull();
    });

    it("imageUrl なし garment の削除時に R2 エラーが起きない", async () => {
      const caller = getCaller();

      const garment = await caller.garment.create(createTestGarmentInput());

      await expect(caller.garment.delete({ id: garment.id })).resolves.toEqual({
        success: true,
      });
    });
  });
});
