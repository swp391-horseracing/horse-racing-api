import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const registerSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(
        ["spectator", "jockey", "horse_owner"],
        "Role must be either spectator, jockey or horse_owner",
    ),
});

const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export { registerSchema, loginSchema };
