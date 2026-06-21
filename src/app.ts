import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.js";
import router from "./route/index.js";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./config/db.js";
import cors from "cors";
import { setupWebSocket } from "./websocket/handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

await migrate(db, { migrationsFolder: "./drizzle" });

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const spec = parse(readFileSync(join(__dirname, "../openapi.yaml"), "utf-8"));

try {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
} catch (err) {
    console.error("Failed to load OpenAPI spec:", err);
}

app.use("/api", router);

app.use(errorMiddleware);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
