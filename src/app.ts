import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.js";
import router from "./route/index.js";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./config/db.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

await migrate(db, { migrationsFolder: "./drizzle" });

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const spec = parse(readFileSync("./openapi.yaml", "utf-8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
app.use("/api", router);

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
