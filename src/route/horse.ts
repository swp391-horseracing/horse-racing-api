import { Router } from "express";
import {
    getHorses,
    getHorse,
    addHorse,
    updateHorse,
    retireHorse,
    getOwnerHorses,
    getHorseRaceHistory,
} from "../controller/horse.js";
import { addHorseSchema, updateHorseSchema } from "../validator/horse.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { createUpload } from "../middleware/upload.js";
import { Role } from "../types/roles.js";

const router = Router();

const horseImageUpload = createUpload({
    maxSizeMB: 5,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
});

router.get("/", getHorses);
router.get("/owner/:ownerId", getOwnerHorses);
router.get("/:id", getHorse);
router.get("/:id/races", getHorseRaceHistory);
router.post(
    "/",
    authMiddleware,
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    horseImageUpload.single("image"),
    validate(addHorseSchema),
    addHorse,
);
router.patch(
    "/:id",
    authMiddleware,
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    horseImageUpload.single("image"),
    validate(updateHorseSchema),
    updateHorse,
);
router.post(
    "/:id/retire",
    authMiddleware,
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    retireHorse,
);

export default router;
