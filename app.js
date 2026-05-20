import "dotenv/config";
import express from "express";
import morgan from "morgan";
import router from "./src/route/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(express.json());

app.use("/api", router);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
