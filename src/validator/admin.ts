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

const tournamentSchema = z.object({
    name: z.string().min(3).max(100),
    startDate: z.iso.datetime().transform((v) => new Date(v)),
    endDate: z.iso.datetime().transform((v) => new Date(v)),
    description: z.string().optional(),
    rules: z.string().optional(),
    location: z.string().max(200).optional(),
    registrationOpenDate: z.iso
        .datetime()
        .transform((v) => new Date(v))
        .optional(),
    registrationCloseDate: z.iso
        .datetime()
        .transform((v) => new Date(v))
        .optional(),
    maximumParticipants: z.number().int().positive().optional(),
    minimumParticipants: z.number().int().positive().optional(),
    prizePool: z.float64().positive().optional(),
});

const createTournamentSchema = tournamentSchema.superRefine((data, ctx) => {
    const start = data.startDate;
    const end = data.endDate;
    if (start >= end) {
        ctx.addIssue({
            code: "custom",
            path: ["endDate"],
            message: "End date must be after start date",
        });
    }
    const openReg = data.registrationOpenDate;
    const closeReg = data.registrationCloseDate;
    if (!openReg || !closeReg) return;

    if (openReg >= closeReg) {
        ctx.addIssue({
            code: "custom",
            path: ["registrationCloseDate"],
            message:
                "Registrationclose date must be after registration open date",
        });
    }

    if (closeReg >= start) {
        ctx.addIssue({
            code: "custom",
            path: ["registrationCloseDate"],
            message: "Registration must close before the tournament starts",
        });
    }
});

const updateTournamentSchema = tournamentSchema
    .partial()
    .superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "At least one field must be provied",
            });
        }

        const start = data.startDate;
        const end = data.endDate;
        if (start && end && start >= end) {
            ctx.addIssue({
                code: "custom",
                path: ["endDate"],
                message: "End date must be after start date",
            });
        }
        const openReg = data.registrationOpenDate;
        const closeReg = data.registrationCloseDate;
        if (!openReg || !closeReg) return;

        if (openReg >= closeReg) {
            ctx.addIssue({
                code: "custom",
                path: ["registrationCloseDate"],
                message:
                    "Registration close date must be after registration open date",
            });
        }

        if (start && closeReg >= start) {
            ctx.addIssue({
                code: "custom",
                path: ["registrationCloseDate"],
                message: "Registration must close before the tournament starts",
            });
        }
    });

export {
    usersQuerySchema,
    updateRoleSchema,
    updateStatusSchema,
    createTournamentSchema,
    updateTournamentSchema,
};
