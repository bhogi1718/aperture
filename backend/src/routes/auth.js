import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const { username, password } = parsed.data;

  if (!env.reviewerPasswordHash) {
    return res.status(500).json({ error: "Reviewer account not configured" });
  }

  if (username !== env.reviewerUsername) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, env.reviewerPasswordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: username, role: "reviewer" }, env.jwtSecret, {
    expiresIn: "8h",
  });

  res.json({ token });
});
