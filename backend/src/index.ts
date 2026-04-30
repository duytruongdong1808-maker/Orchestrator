import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { router } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
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

app.listen(port, () => {
  console.log(`Code Orchestrator backend listening on http://localhost:${port}`);
});
