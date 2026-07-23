import { Router } from "express";
import { getMeProfile } from "../controller/me/profile.js";
import { uploadAvatar } from "../controller/me/avatar.js";
import { getMeRaces, getMeRaceDetail } from "../controller/me/races.js";
import { getMyRegistrations } from "../controller/me/registrations.js";
import {
    getRaceInvitations,
    inviteJockey,
    cancelInvitation,
    confirmJockey,
    getMyInvitations,
    getInvitationDetail,
    acceptInvitation,
    declineInvitation,
} from "../controller/me/invitations.js";
import { getMyPredictions } from "../controller/me/predictions.js";
import { getMyResults, getMyResultDetail } from "../controller/me/result.js";
import { getMyWallet } from "../controller/me/wallet.js";
import { getMyEntries } from "../controller/me/entries.js";
import {
    createRaceEntry,
    withdrawRaceEntry,
} from "../controller/me/raceEntries.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { createUpload } from "../middleware/upload.js";
import { Role } from "../types/roles.js";

const avatarUpload = createUpload({
    maxSizeMB: 2,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
});

const router = Router();

// profile route
router.get("/profile", authMiddleware, getMeProfile);
router.patch(
    "/avatar",
    authMiddleware,
    avatarUpload.single("avatar"),
    uploadAvatar,
);
router.get("/races", authMiddleware, getMeRaces);
router.get("/races/:raceId", authMiddleware, getMeRaceDetail);

// owner registrations
router.get(
    "/registrations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getMyRegistrations,
);

// owner invitations
router.get(
    "/races/:raceId/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getRaceInvitations,
);
router.post(
    "/invitations",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    inviteJockey,
);
router.patch(
    "/races/:raceId/invitations/:id/confirm",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    confirmJockey,
);
router.delete(
    "/races/:raceId/invitations/:id",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    cancelInvitation,
);

// jockey: all received invitations
router.get(
    "/invitations",
    authMiddleware,
    authorize(Role.JOCKEY),
    getMyInvitations,
);
router.get(
    "/invitations/:id",
    authMiddleware,
    authorize(Role.JOCKEY),
    getInvitationDetail,
);

// jockey invitations
router.patch(
    "/invitations/:id/accept",
    authMiddleware,
    authorize(Role.JOCKEY),
    acceptInvitation,
);
router.patch(
    "/invitations/:id/decline",
    authMiddleware,
    authorize(Role.JOCKEY),
    declineInvitation,
);

// spectator predictions
router.get(
    "/predictions",
    authMiddleware,
    authorize(Role.SPECTATOR),
    getMyPredictions,
);

// entries for horse owner
router.get(
    "/entries",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    getMyEntries,
);

// owner race entries (enter/withdraw horse from race)
router.post(
    "/races/:raceId/entries",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    createRaceEntry,
);
router.delete(
    "/races/:raceId/entries/:entryId",
    authMiddleware,
    authorize(Role.HORSE_OWNER),
    withdrawRaceEntry,
);

// wallet
router.get("/wallet", authMiddleware, getMyWallet);

// results for jockey and horse owner
router.get("/results", authMiddleware, getMyResults);
router.get("/results/:raceId", authMiddleware, getMyResultDetail);

export default router;
