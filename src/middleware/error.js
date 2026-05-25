export const errorMiddleware = (err, _req, res) => {
    console.error(err.cause);
    res.status(err.status || 500).json({
        error: err.cause || "Internal Server Error",
    });
};
