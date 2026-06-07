import { router } from "../trpc.js";
import { highlightsAdminRouter } from "./highlightsAdmin.js";
import { highlightsOwnerRouter } from "./highlightsOwner.js";

export const highlightsRouter = router({
  admin: highlightsAdminRouter,
  owner: highlightsOwnerRouter,
});
