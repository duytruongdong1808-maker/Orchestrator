import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { router } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";
const frontendOrigin = process.env.ORCHESTRATOR_FRONTEND_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = new Set([frontendOrigin, "http://127.0.0.1:5173"]);

if (!process.env.ORCHESTRATOR_API_TOKEN) {
  console.warn("Warning: ORCHESTRATOR_API_TOKEN is not set. Protected API routes will reject requests until it is configured.");
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin is not allowed."));
    }
  })
);
app.use(express.json({ limit: "4mb" }));
app.use("/api", router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = firstIssue?.path.join(".") || "request";
    const message = `${field}: ${firstIssue?.message ?? "Invalid value."}`;
    res.status(400).json({ error: message });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(400).json({ error: message });
});

app.listen(port, host, () => {
  console.log(`Code Orchestrator backend listening on http://${host}:${port}`);
});
