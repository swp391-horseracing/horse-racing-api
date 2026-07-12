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
    location: z.string().max(100).optional(),
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

const updateTournamentStatusSchema = z.object({
    status: z.enum([
        "upcoming",
        "registration_open",
        "registration_closed",
        "ongoing",
        "completed",
        "cancelled",
    ]),
});

const tournamentReadinessSchema = z.object({
    name: z.string().min(3).max(100),
    startDate: z.date(),
    endDate: z.date(),
    location: z.string().max(200),
    registrationOpenDate: z.date(),
    registrationCloseDate: z.date(),
    maximumParticipants: z.number().int().positive(),
});

const createRaceSchema = z.object({
    name: z.string().min(3).max(255),
    raceNumber: z.coerce.number().int().positive().optional(),
    courseDistanceId: z.string().uuid("courseDistanceId must be a valid UUID"),
    scheduleAt: z.iso
        .datetime()
        .transform((v) => new Date(v))
        .optional(),
    laneCount: z.coerce.number().int().positive().optional(),
});

const updateRaceSchema = z
    .object({
        name: z.string().min(3).max(255).optional(),
        raceNumber: z.coerce.number().int().positive().optional(),
        courseDistanceId: z
            .string()
            .uuid("courseDistanceId must be a valid UUID")
            .optional(),
        scheduleAt: z.iso
            .datetime()
            .transform((v) => new Date(v))
            .optional(),
        laneCount: z.coerce.number().int().positive().optional(),
    })
    .superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: "custom",
                message: "At least one field must be provided",
            });
        }
    });

const updateRaceStatusSchema = z.object({
    status: z.enum([
        "draft",
        "scheduled",
        "pre_race",
        "ongoing",
        "under_review",
        "result_confirmed",
        "completed",
        "postponed",
        "cancelled",
    ]),
});

const registrationsQuerySchema = z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    tournamentId: z
        .string()
        .uuid("tournamentId must be a valid UUID")
        .optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const updateRegistrationStatusSchema = z
    .object({
        status: z.enum(["approved", "rejected"]),
        rejectReason: z.string().min(1).max(500).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.status === "rejected" && !data.rejectReason) {
            ctx.addIssue({
                code: "custom",
                path: ["rejectReason"],
                message:
                    "rejectReason is required when rejecting a registration",
            });
        }
        if (data.status === "approved" && data.rejectReason) {
            ctx.addIssue({
                code: "custom",
                path: ["rejectReason"],
                message: "rejectReason must not be provided when approving",
            });
        }
    });

const assignRefereeSchema = z.object({
    refereeId: z.uuid("refereeId must be a valid UUID"),
});

const violationTypeConfigQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

const createViolationTypeConfigSchema = z.object({
    violationType: z.string().min(1).max(100),
    pointsDeducted: z.number().int().min(1),
    description: z.string().optional(),
});

const updateViolationTypeConfigSchema = z.object({
    violationType: z.string().min(1).max(100).optional(),
    pointsDeducted: z.number().int().min(1),
    description: z.string().optional(),
});

export {
    usersQuerySchema,
    updateRoleSchema,
    updateStatusSchema,
    createTournamentSchema,
    updateTournamentSchema,
    updateTournamentStatusSchema,
    tournamentReadinessSchema,
    createRaceSchema,
    updateRaceSchema,
    updateRaceStatusSchema,
    registrationsQuerySchema,
    updateRegistrationStatusSchema,
    assignRefereeSchema,
    createViolationTypeConfigSchema,
    updateViolationTypeConfigSchema,
    violationTypeConfigQuerySchema,
};
