import { Router } from "express";
import { getProfile, updateProfile } from "../controller/profile.js";
import { updateProfileSchema } from "../validator/profile.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/:id", getProfile);
router.patch(
    "/:id",
    authMiddleware,
    validate(updateProfileSchema),
    updateProfile,
);

export default router;
