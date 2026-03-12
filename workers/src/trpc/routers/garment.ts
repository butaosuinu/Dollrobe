import { router, publicProcedure } from "../index";

export const garmentRouter = router({
  list: publicProcedure.query(() => []),
});
