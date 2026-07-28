import { z } from "zod";

export const listShopItemsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

export const purchaseItemSchema = z.object({
    itemId: z.uuid(),
});

export const createShopItemSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().default(""),
    price: z.coerce.number().int().min(0),
});

export const updateShopItemSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    price: z.coerce.number().int().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
});
