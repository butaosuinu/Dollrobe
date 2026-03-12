import { router, publicProcedure } from "../index";

export const coordinateRouter = router({
  list: publicProcedure.query(() => []),
});
