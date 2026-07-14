import { router } from "../trpc.js";
import { adminOwnersRouter } from "./adminOwners.js";
import { adminRentalsRouter } from "./adminRentals.js";

export const adminRouter = router({
  owners: adminOwnersRouter,
  rentals: adminRentalsRouter,
});
