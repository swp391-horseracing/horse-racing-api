import { Role } from "./roles.ts";

declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            role: Role;
            tokenVersion: number;
        }
    }
}

export {};
