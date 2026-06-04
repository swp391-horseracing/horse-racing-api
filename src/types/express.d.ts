import { Role } from "./roles.js";

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
