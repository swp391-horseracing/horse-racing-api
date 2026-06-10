import { Router } from "express";
import {
    getMeProfile,
    getMeRaceDetail,
    getMeRaces,
    getMyRegistrations,
    getRaceInvitations,
    inviteJockey,
    cancelInvitation,
    confirmInvitation,
} from "../controller/me.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/profile", authMiddleware, getMeProfile);
router.get("/races", authMiddleware, getMeRaces);
router.get("/races/:raceId", authMiddleware, getMeRaceDetail);
router.get(
    "/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getMyRegistrations,
);
router.get(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER, Role.JOCKEY),
    getRaceInvitations,
);
router.post(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    inviteJockey,
);
router.delete(
    "/races/:raceId/invitations/:id",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    cancelInvitation,
);
router.patch(
    "/races/:raceId/invitations/:id/confirm",
    authMiddleware,
    authorize(Role.JOCKEY),
    confirmInvitation,
);

export default router;
