import axios from "axios";
import { NextFunction, Request, Response } from "express";
import config from "../config/config.js";

interface RecaptchaVerifyResponse {
    success: boolean;
    challenge_ts: string;
    hostname: string;
    "error-codes"?: string[];
}

export const verifyRecaptcha = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (["dev", "development"].includes(config().NODE_ENV)) {
        return next();
    }
    const token = req.body?.captchaToken;

    if (!token) {
        return res.status(400).json({ message: "reCaptcha token is required" });
    }

    try {
        const { data } = await axios.post<RecaptchaVerifyResponse>(
            "https://www.google.com/recaptcha/api/siteverify",
            null,
            {
                params: {
                    secret: config().CAPTCHA_SECRET_KEY,
                    response: token,
                },
            },
        );

        if (!data.success) {
            return res.status(400).json({
                message: "reCaptcha verification failed",
                codes: data["error-codes"],
            });
        }

        next();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        res.status(500).json({
            message: "Failed to verify reCaptcha",
        });
        next(err);
    }
};
