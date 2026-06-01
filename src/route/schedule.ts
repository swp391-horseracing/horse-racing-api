import { Router } from "express";
import { getRaceSchedule } from "../controller/schedule.js";

const router = Router();

router.get("/races", getRaceSchedule);

export default router;
