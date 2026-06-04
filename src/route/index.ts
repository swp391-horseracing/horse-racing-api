import { Router } from "express";
import authRoutes from "./auth.js";
import profileRoutes from "./profile.js";
import scheduleRoutes from "./schedule.js";
import raceRoutes from "./race.js";
import horseRoutes from "./horse.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/races", raceRoutes);
router.use("/horses", horseRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
