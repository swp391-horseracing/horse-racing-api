import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    updateCourseStatusSchema,
} from "../validator/course.js";
import {
    getRaceCourse,
    getRaceCourses,
    updateCourseStatus,
} from "../controller/course.js";
const router = Router();

router.get("/", getRaceCourses);
router.get("/:courseId", getRaceCourse);

router.patch(
    "/:courseId/status",
    authMiddleware,
    authorize(Role.ADMIN),
    validate(updateCourseStatusSchema),
    updateCourseStatus,
);

export default router;
