import { router, publicProcedure } from "../index";

export const syncRouter = router({
  push: publicProcedure.mutation(() => ({ success: true })),
});
