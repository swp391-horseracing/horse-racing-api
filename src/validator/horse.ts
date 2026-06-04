import { z } from "zod";

const addHorseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    breed: z.string().min(1, "Breed is required"),
    birthDate: z.string().optional(),
    weightKg: z.string().optional(),
    imageUrl: z.string().optional(),
    healthStatus: z.string().optional(),
});

const updateHorseSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    breed: z.string().min(1, "Breed cannot be empty").optional(),
    birthDate: z.string().optional(),
    weightKg: z.string().optional(),
    imageUrl: z.string().optional(),
    healthStatus: z.string().optional(),
});

export { addHorseSchema, updateHorseSchema };
