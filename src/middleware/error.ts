import { NextFunction, Request, Response } from "express";
import multer from "multer";

export const errorMiddleware = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    console.error(err);

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                error: "File too large",
            });
        }
        return res.status(400).json({
            error: err.message,
        });
    }

    if (err.message?.startsWith("Invalid file type")) {
        return res.status(400).json({
            error: err.message,
        });
    }

    if (err.cause?.code === "ENOTFOUND") {
        return res.status(503).json({
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "Unable to connect to the database",
            },
        });
    }

    return res.status(500).json({
        error: err.code || "Internal Server Error",
    });
};
