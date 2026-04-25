import { router } from "./trpc.js";
import { addressRouter } from "./routers/address.js";
import { authRouter } from "./routers/auth.js";
import { driverRouter } from "./routers/driver.js";
import { marketplaceRouter } from "./routers/marketplace.js";
import { ownerRouter } from "./routers/owner.js";
import { rentalInspectionRouter } from "./routers/rentalInspection.js";
import { rentalReviewRouter } from "./routers/rentalReview.js";

export const appRouter = router({
  auth: authRouter,
  address: addressRouter,
  owner: ownerRouter,
  driver: driverRouter,
  marketplace: marketplaceRouter,
  rentalInspection: rentalInspectionRouter,
  rentalReview: rentalReviewRouter,
});

export type AppRouter = typeof appRouter;
