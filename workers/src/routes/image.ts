import { Hono } from "hono";
import type { Env } from "../types";
import type { Logger } from "../lib/logger";
import type { Auth } from "../auth";
import * as imageService from "../services/image-service";
import { resolveAuthenticatedUserId } from "../lib/auth-resolver";
import { cuidSchema } from "../db/validation";

type Variables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const imageRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

imageRoutes.post("/upload/:garmentId", async (c) => {
  const logger = c.get("logger").child({ route: "image/upload" });

  const userId = await resolveAuthenticatedUserId({
    auth: c.get("auth"),
    headers: c.req.raw.headers,
  });
  if (userId === undefined) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const garmentId = c.req.param("garmentId");

  const parseResult = cuidSchema.safeParse(garmentId);
  if (!parseResult.success) {
    return c.json({ error: "Invalid garment ID" }, 400);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Content-Type must be multipart/form-data" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json({ error: "file field is required" }, 400);
  }

  const validation = imageService.validateFile({
    size: file.size,
    mimeType: file.type,
  });

  if (!validation.ok) {
    return c.json({ error: validation.error.message }, 400);
  }

  const key = imageService.buildR2Key({
    userId,
    garmentId,
    mimeType: validation.data.validMimeType,
  });

  const arrayBuffer = await file.arrayBuffer();

  const uploadResult = await imageService.uploadImage({
    bucket: c.env.BUCKET,
    key,
    body: arrayBuffer,
    mimeType: file.type,
    logger,
  });

  if (!uploadResult.ok) {
    return c.json({ error: uploadResult.error.message }, 500);
  }

  const imageUrl = imageService.buildPublicUrl({
    r2PublicUrl: c.env.R2_PUBLIC_URL,
    key,
  });

  logger.info("image upload complete", { garmentId, imageUrl });

  return c.json({ imageUrl });
});

export { imageRoutes };
