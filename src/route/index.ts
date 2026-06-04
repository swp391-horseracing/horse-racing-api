import { Router } from "express";
import authRoutes from "./auth.js";
import profileRoutes from "./profile.js";
import scheduleRoutes from "./schedule.js";
import raceRoutes from "./race.js";
import horseRoutes from "./horse.js";
import tournamentRoutes from "./tournament.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/races", raceRoutes);
router.use("/horses", horseRoutes);
router.use("/tournaments", tournamentRoutes);

router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
