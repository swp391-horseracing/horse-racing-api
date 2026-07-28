import { Router } from "express";
import { Role } from "../types/roles.js";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import {
    listShopItems,
    getShopItem,
    purchaseItem,
    getInventory,
} from "../controller/shop.js";
import { purchaseItemSchema } from "../validator/shop.js";

const router = Router();

router.get("/items", listShopItems);
router.get("/items/:itemId", getShopItem);
router.post(
    "/purchase",
    authMiddleware,
    authorize(Role.SPECTATOR),
    validate(purchaseItemSchema),
    purchaseItem,
);
router.get("/inventory", authMiddleware, getInventory);

export default router;
