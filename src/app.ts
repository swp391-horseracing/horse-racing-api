import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.js";
import router from "./route/index.js";
import { generateOpenApiDoc } from "./docs/openapi.js";
import swaggerUi from "swagger-ui-express";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

await migrate(db, { migrationsFolder: "./drizzle" });

app.use(morgan("dev"));
app.use(express.json());

const openApiDoc = generateOpenApiDoc();
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));
app.use("/api", router);

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
