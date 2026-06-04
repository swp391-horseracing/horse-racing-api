import { z } from "zod";

const birthDateField = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD")
    .optional();

const weightKgField = z
    .string()
    .regex(
        /^\d+(\.\d{1,2})?$/,
        "weightKg must be a positive number with at most 2 decimal places",
    )
    .optional();

const addHorseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    breed: z.string().min(1, "Breed is required"),
    birthDate: birthDateField,
    weightKg: weightKgField,
    imageUrl: z.string().optional(),
    healthStatus: z.string().optional(),
});

const updateHorseSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    breed: z.string().min(1, "Breed cannot be empty").optional(),
    birthDate: birthDateField,
    weightKg: weightKgField,
    imageUrl: z.string().optional(),
    healthStatus: z.string().optional(),
});

export { addHorseSchema, updateHorseSchema };
