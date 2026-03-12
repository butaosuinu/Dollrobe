import { router, publicProcedure } from "../index";

export const locationRouter = router({
  list: publicProcedure.query(() => []),
});
