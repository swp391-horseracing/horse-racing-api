import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { errorMiddleware } from "./middleware/error.js";
import router from "./route/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(express.json());

app.use("/api", router);

app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
