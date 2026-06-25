import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    createCourseSchema,
    updateCourseStatusSchema,
    createCourseDistanceSchema,
} from "../validator/course.js";
import {
    addCourseDistance,
    createRaceCourse,
    getRaceCourse,
    getRaceCourses,
    getTrackShapes,
    removeCourseDistance,
    updateCourseStatus,
} from "../controller/course.js";
const router = Router();

router.get("/track-shapes", getTrackShapes);
router.get("/", getRaceCourses);
router.get("/:courseId", getRaceCourse);

router.post(
    "/",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createCourseSchema),
    createRaceCourse,
);
router.patch(
    "/:courseId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateCourseStatusSchema),
    updateCourseStatus,
);
router.post(
    "/:courseId/distances",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(createCourseDistanceSchema),
    addCourseDistance,
);
router.delete(
    "/:courseId/distances/:distanceId",
    authMiddleware,
    authorize(Role.ADMIN),
    removeCourseDistance,
);

export default router;
