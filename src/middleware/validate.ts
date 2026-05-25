import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export const validate =
    (schema: ZodObject) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Validation error",
                errors: result.error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        req.body = result.data;
        next();
    };
