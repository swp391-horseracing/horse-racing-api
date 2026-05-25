import { Router } from "express";
import authRoutes from "./auth.js";

const router = Router();

router.use("/auth", authRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
