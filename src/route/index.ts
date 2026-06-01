import { Router } from "express";
import authRoutes from "./auth.js";
import profileRoutes from "./profile.js";
import scheduleRoutes from "./schedule.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/schedule", scheduleRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
