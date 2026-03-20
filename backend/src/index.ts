import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import { createContext } from "./context.js";
import { appRouter } from "./router.js";

const port = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API tRPC em http://localhost:${port}/trpc`);
});

export { appRouter };
export type { AppRouter } from "./router.js";
