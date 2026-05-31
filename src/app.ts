import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.js";
import router from "./route/index.js";
import { generateOpenApiDoc } from "./docs/openapi.js";
import swaggerUi from "swagger-ui-express";

const app = express();
const PORT = process.env.PORT || 3000;

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
