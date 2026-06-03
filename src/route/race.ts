import { Router } from "express";
import { getRace } from "../controller/race.js";

const router = Router();

router.get("/:raceId", getRace);

export default router;
