import { NextFunction, Request, Response } from "express";

export const errorMiddleware = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    console.error(err);

    if (err.cause.code === "ENOTFOUND") {
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
