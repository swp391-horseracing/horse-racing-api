import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import {
    assignRaceReferee,
    createTournament,
    createTournamentRace,
    createViolationTypeConfig,
    deleteViolationTypeConfig,
    getRaceReferee,
    getRaceReport,
    getRegistrations,
    getReports,
    getUser,
    getUsers,
    listViolationTypeConfigs,
    unassignRaceReferee,
    updateRace,
    updateRaceStatus,
    updateRegistrationStatus,
    updateTournament,
    updateTournamentStatus,
    updateUserRole,
    updateUserStatus,
    updateViolationTypeConfig,
} from "../controller/admin.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    assignRefereeSchema,
    createRaceSchema,
    createTournamentSchema,
    createViolationTypeConfigSchema,
    updateRaceSchema,
    updateRaceStatusSchema,
    updateRegistrationStatusSchema,
    updateRoleSchema,
    updateStatusSchema,
    updateTournamentSchema,
    updateTournamentStatusSchema,
    updateViolationTypeConfigSchema,
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
    authorize(Role.ADMIN, Role.REFEREE),
    validate(updateRaceStatusSchema),
    updateRaceStatus,
);
router.get(
    "/registrations",
    authMiddleware,
    authorize(Role.ADMIN),
    getRegistrations,
);
router.patch(
    "/registrations/:id",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateRegistrationStatusSchema),
    updateRegistrationStatus,
);
router.get(
    "/races/:raceId/referee",
    authMiddleware,
    authorize(Role.ADMIN),
    getRaceReferee,
);
router.put(
    "/races/:raceId/referee",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(assignRefereeSchema),
    assignRaceReferee,
);
router.delete(
    "/races/:raceId/referee/:refereeId",
    authMiddleware,
    authorize(Role.ADMIN),
    unassignRaceReferee,
);

router.get("/reports", authMiddleware, authorize(Role.ADMIN), getReports);

router.get(
    "/races/:raceId/report",
    authMiddleware,
    authorize(Role.ADMIN),
    getRaceReport,
);

router.get(
    "/violation-types",
    authMiddleware,
    authorize(Role.ADMIN, Role.REFEREE),
    listViolationTypeConfigs,
);

router.post(
    "/violation-types",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createViolationTypeConfigSchema),
    createViolationTypeConfig,
);

router.patch(
    "/violation-types/:id",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateViolationTypeConfigSchema),
    updateViolationTypeConfig,
);

router.delete(
    "/violation-types/:id",
    authMiddleware,
    authorize(Role.ADMIN),
    deleteViolationTypeConfig,
);

export default router;
