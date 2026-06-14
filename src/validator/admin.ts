import { z } from "zod";

const usersQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(["pending", "active", "locked"]).optional(),
    role: z
        .enum(["jockey", "spectator", "horse_owner", "referee", "admin"])
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const updateRoleSchema = z.object({
    role: z.enum(["jockey", "spectator", "horse_owner", "referee", "admin"]),
});

const updateStatusSchema = z.object({
    status: z.enum(["active", "locked"]),
});

const createTournamentSchema = z
    .object({
        name: z.string().min(3).max(100),
        startDate: z.iso.datetime(),
        endDate: z.iso.datetime(),
        description: z.string().optional(),
        rules: z.string().optional(),
        location: z.string().max(200).optional(),
        registrationOpenDate: z.iso.datetime().optional(),
        registrationCloseDate: z.iso.datetime().optional(),
        maximumParticipants: z.number().int().positive().optional(),
        minimumParticipants: z.number().int().positive().optional(),
        prizePool: z.float64().positive().optional(),
    })
    .superRefine((data, ctx) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start >= end) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date must be after start date",
            });
        }
        if (!data.registrationOpenDate || !data.registrationCloseDate) return;

        const regOpen = new Date(data.registrationOpenDate);
        const regClose = new Date(data.registrationCloseDate);

        if (regOpen >= regClose) {
            ctx.addIssue({
                code: "custom",
                path: ["registrationCloseDate"],
                message:
                    "Registrationclose date must be after registration open date",
            });
        }

        if (regClose >= start) {
            ctx.addIssue({
                code: "custom",
                path: ["registrationCloseDate"],
                message: "Registration must close before the tournament starts",
            });
        }

        if (regOpen >= regClose) {
            ctx.addIssue({
                code: "custom",
                path: ["registrationCloseDate"],
                message: "Registration must close after registration open",
            });
        }
    });

export {
    usersQuerySchema,
    updateRoleSchema,
    updateStatusSchema,
    createTournamentSchema,
};
