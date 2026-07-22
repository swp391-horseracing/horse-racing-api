import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import db from "../../config/db.js";
import { users } from "../../schema/users.js";
import { randomHex } from "../../utils/randomHex.js";
import { uploadFile, deleteFile } from "../../utils/s3.js";

export const uploadAvatar = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let uploadedKey: string | null = null;

    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const [user] = await db
            .select({ avatar_url: users.avatar_url })
            .from(users)
            .where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const ext = req.file.mimetype.split("/")[1];
        const key = `avatars/${userId}/${randomHex(16)}.${ext}`;

        await uploadFile(key, req.file);
        uploadedKey = key;

        await db
            .update(users)
            .set({ avatar_url: key, updatedAt: new Date() })
            .where(eq(users.id, userId));

        if (user.avatar_url) {
            await deleteFile(user.avatar_url);
        }

        res.json({ avatar_url: key });
    } catch (err) {
        if (uploadedKey) {
            try {
                await deleteFile(uploadedKey);
            } catch (deleteErr) {
                console.error("Failed to cleanup uploaded file:", deleteErr);
            }
        }
        next(err);
    }
};
