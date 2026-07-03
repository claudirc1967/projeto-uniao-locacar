import { router } from "../trpc.js";
import { adminOwnersRouter } from "./adminOwners.js";

export const adminRouter = router({
  owners: adminOwnersRouter,
});
