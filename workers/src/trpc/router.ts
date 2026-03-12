import { router } from "./index";
import { garmentRouter } from "./routers/garment";
import { locationRouter } from "./routers/location";
import { scanRouter } from "./routers/scan";
import { syncRouter } from "./routers/sync";
import { digestRouter } from "./routers/digest";
import { coordinateRouter } from "./routers/coordinate";

export const appRouter = router({
  garment: garmentRouter,
  location: locationRouter,
  scan: scanRouter,
  sync: syncRouter,
  digest: digestRouter,
  coordinate: coordinateRouter,
});

export type AppRouter = typeof appRouter;
