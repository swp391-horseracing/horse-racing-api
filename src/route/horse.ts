import { Router } from "express";
import {
    getHorses,
    getHorse,
    addHorse,
    updateHorse,
    retireHorse,
} from "../controller/horse.js";
import { addHorseSchema, updateHorseSchema } from "../validator/horse.js";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { Role } from "../types/roles.js";

const router = Router();

router.get("/", getHorses);
router.get("/:id", getHorse);
router.post(
    "/",
    authMiddleware,
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    validate(addHorseSchema),
    addHorse,
);
router.patch(
    "/:id",
    authMiddleware,
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    validate(updateHorseSchema),
    updateHorse,
);
router.post(
    "/:id/retire",
    authorize(Role.ADMIN, Role.HORSE_OWNER),
    authMiddleware,
    retireHorse,
);

export default router;
