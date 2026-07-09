import { z } from "zod/v4";

const placementItemSchema = z.object({
    entryId: z.uuid(),
    finishedPosition: z.number().int().positive(),
    finishTime: z
        .string()
        .regex(/^\d+(\.\d{1,3})?$/)
        .optional(),
    finishStatus: z.enum(["finished", "dnf", "dsq", "dns"]).default("finished"),
    points: z.number().int().min(0).default(0),
});

export const updatePlacementsSchema = z.object({
    placements: z.array(placementItemSchema).min(1),
});

export const createViolationSchema = z.object({
    entryId: z.uuid(),
    occurredAt: z.iso.datetime(),
    violationType: z.string().min(1).max(100),
    description: z.string().min(1),
    severity: z.enum([
        "warning",
        "disqualification",
        "result_cancellation",
        "point_deduction",
    ]),
    note: z.string().optional(),
});

export const submitReportSchema = z.object({
    notes: z.string().optional(),
});

export const inspectEntrySchema = z.object({
    result: z.enum(["cleared", "disqualified", "withdrawn"]),
    healthStatus: z.enum(["healthy", "injured", "sick", "rest"]).optional(),
});
