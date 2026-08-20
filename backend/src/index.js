import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { applicationsRouter } from "./routes/applications.js";
import { authRouter } from "./routes/auth.js";
import { applicantAuthRouter } from "./routes/applicantAuth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/applications", applicationsRouter);
app.use("/api/auth", authRouter);
app.use("/api/applicant-auth", applicantAuthRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Aperture backend listening on port ${env.port} (LLM provider: ${env.llmProvider})`);
});
