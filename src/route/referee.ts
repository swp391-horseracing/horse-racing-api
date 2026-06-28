import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    createViolation,
    deleteViolation,
    getRefereeRaceEntries,
    getRefereeRaceReport,
    inspectEntry,
    submitReport,
    updatePlacements,
} from "../controller/referee.js";
import {
    createViolationSchema,
    inspectEntrySchema,
    submitReportSchema,
    updatePlacementsSchema,
} from "../validator/referee.js";

const router = Router();

router.get(
    "/races/:raceId/report",
    authMiddleware,
    authorize(Role.REFEREE),
    getRefereeRaceReport,
);

router.get(
    "/races/:raceId/entries",
    authMiddleware,
    authorize(Role.REFEREE),
    getRefereeRaceEntries,
);

router.patch(
    "/races/:raceId/entries/:entryId/inspection",
    authMiddleware,
    authorize(Role.REFEREE),
    validate(inspectEntrySchema),
    inspectEntry,
);

router.put(
    "/races/:raceId/report/placements",
    authMiddleware,
    authorize(Role.REFEREE),
    validate(updatePlacementsSchema),
    updatePlacements,
);

router.post(
    "/races/:raceId/report/violations",
    authMiddleware,
    authorize(Role.REFEREE),
    validate(createViolationSchema),
    createViolation,
);

router.delete(
    "/races/:raceId/report/violations/:violationId",
    authMiddleware,
    authorize(Role.REFEREE),
    deleteViolation,
);

router.patch(
    "/races/:raceId/report/submit",
    authMiddleware,
    authorize(Role.REFEREE),
    validate(submitReportSchema),
    submitReport,
);

export default router;
