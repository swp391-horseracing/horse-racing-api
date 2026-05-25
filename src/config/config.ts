import dotenv from "dotenv";

dotenv.config();

interface Env {
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
}

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

if (!process.env.JWT_EXPIRES_IN) {
    throw new Error("JWT_EXPIRES_IN is not defined");
}

const config = (): Env => {
    return {
        PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
        DATABASE_URL: String(process.env.DATABASE_URL),
        JWT_SECRET: String(process.env.JWT_SECRET),
        JWT_EXPIRES_IN: String(process.env.JWT_EXPIRES_IN),
    };
};

export default config;
