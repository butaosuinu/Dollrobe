import { router } from "./index";
import { adminRouter } from "./routers/admin";
import { garmentRouter } from "./routers/garment";
import { locationRouter } from "./routers/location";
import { scanRouter } from "./routers/scan";
import { syncRouter } from "./routers/sync";
import { digestRouter } from "./routers/digest";
import { coordinateRouter } from "./routers/coordinate";
import { dollRouter } from "./routers/doll";

export const appRouter = router({
  admin: adminRouter,
  garment: garmentRouter,
  location: locationRouter,
  scan: scanRouter,
  sync: syncRouter,
  digest: digestRouter,
  coordinate: coordinateRouter,
  doll: dollRouter,
});

export type AppRouter = typeof appRouter;
