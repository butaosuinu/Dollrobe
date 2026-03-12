import { router, publicProcedure } from "../index";

export const digestRouter = router({
  generate: publicProcedure.mutation(() => ({ success: true })),
});
