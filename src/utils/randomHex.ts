import crypto from "crypto";
export const randomHex = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString("hex");
};
