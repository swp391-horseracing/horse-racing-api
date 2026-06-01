import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import config from "./config.js";

const pool = new Pool({
    host: config().DB_HOST,
    port: Number(config().DB_PORT),
    user: config().DB_USERNAME,
    password: config().DB_PASSWORD,
    database: config().DB_DATABASE,
});

const db = drizzle(pool);

export default db;
