import { router, publicProcedure } from "../index";

export const scanRouter = router({
  checkin: publicProcedure.mutation(() => ({ success: true })),
  checkout: publicProcedure.mutation(() => ({ success: true })),
  confirmAll: publicProcedure.mutation(() => ({ success: true })),
  orphanResolve: publicProcedure.mutation(() => ({ success: true })),
});
