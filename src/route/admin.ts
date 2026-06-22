import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import {
    createTournament,
    createTournamentRace,
    getRaceReport,
    getReports,
    getUser,
    getUsers,
    publishRaceResult,
    updateRace,
    updateRaceStatus,
    updateTournament,
    updateTournamentStatus,
    updateUserRole,
    updateUserStatus,
} from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    createRaceSchema,
    createTournamentSchema,
    updateRaceSchema,
    updateRaceStatusSchema,
    updateRoleSchema,
    updateStatusSchema,
    updateTournamentSchema,
    updateTournamentStatusSchema,
} from "../validator/admin.js";

const router = Router();

router.get("/users", authMiddleware, authorize(Role.ADMIN), getUsers);
router.get("/users/:userId", authMiddleware, authorize(Role.ADMIN), getUser);
router.patch(
    "/users/:userId/role",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRoleSchema),
    updateUserRole,
);
router.patch(
    "/users/:userId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateStatusSchema),
    updateUserStatus,
);
router.post(
    "/tournaments",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createTournamentSchema),
    createTournament,
);
router.patch(
    "/tournaments/:tournamentId",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateTournamentSchema),
    updateTournament,
);
router.patch(
    "/tournaments/:tournamentId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateTournamentStatusSchema),
    updateTournamentStatus,
);
router.post(
    "/tournaments/:tournamentId/races",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createRaceSchema),
    createTournamentRace,
);
router.patch(
    "/races/:raceId",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRaceSchema),
    updateRace,
);
router.patch(
    "/races/:raceId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRaceStatusSchema),
    updateRaceStatus,
);

router.get("/reports", authMiddleware, authorize(Role.ADMIN), getReports);

router.get(
    "/races/:raceId/report",
    authMiddleware,
    authorize(Role.ADMIN),
    getRaceReport,
);

router.patch(
    "/races/:raceId/publish",
    authMiddleware,
    authorize(Role.ADMIN),
    publishRaceResult,
);

export default router;
