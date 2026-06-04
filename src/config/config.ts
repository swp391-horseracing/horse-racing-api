import dotenv from "dotenv";

dotenv.config();

interface Env {
    PORT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    DB_DATABASE: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    DB_PORT: string;
    CAPTCHA_SECRET_KEY: string;
    NODE_ENV: string;
}
if (!process.env.DB_DATABASE) {
    throw new Error("DB_DATABASE is not defined");
}

if (!process.env.DB_USERNAME) {
    throw new Error("DB_USERNAME is not defined");
}

if (!process.env.DB_HOST) {
    throw new Error("DB_HOST is not defined");
}

if (!process.env.DB_PORT) {
    throw new Error("DB_PORT is not defined");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

if (!process.env.JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
}

if (!process.env.CAPTCHA_SECRET_KEY) {
    throw new Error("CAPTCHA_SECRET_KEY is not defined");
}

const config = (): Env => {
    return {
        PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
        DB_DATABASE: String(process.env.DB_DATABASE),
        DB_USERNAME: String(process.env.DB_USERNAME),
        DB_PASSWORD: String(process.env.DB_PASSWORD),
        DB_HOST: String(process.env.DB_HOST),
        DB_PORT: String(process.env.DB_PORT),
        JWT_SECRET: String(process.env.JWT_SECRET),
        JWT_EXPIRES_IN: String(process.env.JWT_EXPIRES_IN),
        CAPTCHA_SECRET_KEY: String(process.env.CAPTCHA_SECRET_KEY),
        NODE_ENV: String(process.env.NODE_ENV),
    };
};

export default config;
