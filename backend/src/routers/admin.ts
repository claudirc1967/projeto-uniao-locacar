import { router } from "../trpc.js";
import { adminDriversRouter } from "./adminDrivers.js";
import { adminOwnersRouter } from "./adminOwners.js";
import { adminRentalsRouter } from "./adminRentals.js";

export const adminRouter = router({
  owners: adminOwnersRouter,
  rentals: adminRentalsRouter,
  drivers: adminDriversRouter,
});
