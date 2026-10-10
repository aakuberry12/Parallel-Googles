import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { searchRouter, liveAvailable } from "./routes/search.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use("/api", searchRouter);

// Serve the built client in production (npm run build && npm start).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.message);
  res.status(400).json({ error: "Invalid request." });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Parallel Googles server on http://localhost:${port}`);
  console.log(liveAvailable() ? "Mode: LIVE (SerpApi)" : "Mode: DEMO (no SERPAPI_KEY set, results are synthetic samples)");
});
