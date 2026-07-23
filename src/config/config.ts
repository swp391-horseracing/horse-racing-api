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
    S3_BUCKET_NAME: string;
    S3_ENDPOINT_URL: string;
    S3_ACCESS_KEY: string;
    S3_SECRET_KEY: string;
    AWS_REGION: string;
    REDIS_URL: string;
    DAILY_REWARD_POINTS: string;
    RACE_SPEED_MULTIPLIER: number;
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

if (!process.env.S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME is not defined");
}

if (!process.env.S3_ENDPOINT_URL) {
    throw new Error("S3_ENDPOINT_URL is not defined");
}

if (!process.env.S3_ACCESS_KEY) {
    throw new Error("S3_ACCESS_KEY is not defined");
}

if (!process.env.S3_SECRET_KEY) {
    throw new Error("S3_SECRET_KEY is not defined");
}

if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is not defined");
}

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined");
}

const nodeEnv = process.env.NODE_ENV?.toLowerCase();
const isDev = nodeEnv === "dev" || nodeEnv === "development";

if (!isDev && !process.env.CAPTCHA_SECRET_KEY) {
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
        NODE_ENV: String(nodeEnv),
        S3_BUCKET_NAME: String(process.env.S3_BUCKET_NAME),
        S3_ENDPOINT_URL: String(process.env.S3_ENDPOINT_URL),
        S3_ACCESS_KEY: String(process.env.S3_ACCESS_KEY),
        S3_SECRET_KEY: String(process.env.S3_SECRET_KEY),
        AWS_REGION: String(process.env.AWS_REGION),
        REDIS_URL: String(process.env.REDIS_URL),
        DAILY_REWARD_POINTS: process.env.DAILY_REWARD_POINTS ?? "10",
        RACE_SPEED_MULTIPLIER: process.env.RACE_SPEED_MULTIPLIER
            ? Number(process.env.RACE_SPEED_MULTIPLIER)
            : 1,
    };
};

export default config;
