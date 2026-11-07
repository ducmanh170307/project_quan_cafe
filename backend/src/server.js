const app = require("./app");
const db = require("./config/db");
const port = Number(process.env.PORT || 5000),
  host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(
    `KiotCafe: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
  ),
);
server.on("error", (err) => {
  console.error(
    err.code === "EADDRINUSE"
      ? `Cổng ${port} đang được sử dụng. Đổi PORT trong backend/.env.`
      : err.message,
  );
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(async () => {
      await db.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  });
