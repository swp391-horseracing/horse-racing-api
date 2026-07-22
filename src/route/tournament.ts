import { Router } from "express";
import {
    getTournament,
    getTournamentRaces,
    getTournaments,
    registerForTournament,
    getTournamentRegistration,
    getTournamentParticipants,
} from "../controller/tournament.js";
import { optionalAuthMiddleware } from "../middleware/optionalAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/", optionalAuthMiddleware, getTournaments);
router.get("/:id", optionalAuthMiddleware, getTournament);
router.get(
    "/:id/participants",
    optionalAuthMiddleware,
    getTournamentParticipants,
);
router.get("/:id/races", optionalAuthMiddleware, getTournamentRaces);
router.post(
    "/:id/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    registerForTournament,
);
router.get("/:id/registrations/:regId", getTournamentRegistration);

export default router;
