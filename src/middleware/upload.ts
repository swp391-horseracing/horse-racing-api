import multer from "multer";

const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function createUpload({
    maxSizeMB = 5,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
} = {}) {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: maxSizeMB * 1024 * 1024,
        },
        fileFilter: (_req, file, cb) => {
            if (!allowedTypes.includes(file.mimetype)) {
                return cb(
                    new Error(
                        `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
                    ),
                );
            }
            cb(null, true);
        },
    });
}
