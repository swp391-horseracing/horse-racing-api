import { Router } from "express";
import { getTournament, getTournaments } from "../controller/tournament.js";

const router = Router();

router.get("/", getTournaments);
router.get("/:id", getTournament);

export default router;
