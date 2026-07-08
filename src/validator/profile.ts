import { z } from "zod";

const updateProfileSchema = z.object({
    full_name: z
        .string()
        .min(2, "Full name must be at least 2 characters")
        .optional(),
    email: z.email("Invalid email address").optional(),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .optional(),
    phone: z.string().max(15, "Phone must be at most 15 characters").optional(),
    address: z
        .string()
        .max(225, "Address must be at most 225 characters")
        .optional(),
});

export { updateProfileSchema };
