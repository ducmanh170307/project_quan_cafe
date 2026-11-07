const express = require("express");
const path = require("node:path");
const cors = require("cors");
const db = require("./config/db");
const { AppError, route } = require("./lib/errors");
const auth = require("./middleware/auth");
const app = express();
app.disable("x-powered-by");
app.use(
  cors((req, done) =>
    done(null, {
      origin:
        req.headers.origin === `${req.protocol}://${req.get("host")}`
          ? req.headers.origin
          : false,
      credentials: true,
    }),
  ),
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    let origin;
    try {
      origin = new URL(req.headers.origin);
    } catch {
      return next(new AppError(403, "Nguồn yêu cầu không hợp lệ."));
    }
    if (origin.host !== req.get("host"))
      return next(
        new AppError(403, "Yêu cầu phải gửi từ cùng địa chỉ ứng dụng."),
      );
  }
  next();
});
app.use("/api/products/images", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "200kb" }));
app.get(
  "/api/health",
  route(async (req, res) => {
    try {
      const r = await db.query(
        `SELECT DB_NAME() AS databaseName,(SELECT TRY_CONVERT(INT,value) FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSchemaVersion') AS schemaVersion,(SELECT TRY_CONVERT(INT,value) FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSeedVersion') AS seedVersion`,
      );
      if (
        r.recordset[0]?.schemaVersion !== 4 ||
        r.recordset[0]?.seedVersion !== 4
      )
        throw new Error("schema");
      res.json({ success: true, database: "connected", schemaVersion: 4 });
    } catch {
      res.status(503).json({
        success: false,
        message:
          "Chưa kết nối được database hoặc chưa chạy đủ hai script SQL. Kiểm tra backend/.env và chạy npm run db:check.",
      });
    }
  }),
);
app.post("/api/auth/login", route(auth.login));
app.post("/api/auth/logout", route(auth.logout));
app.get(
  "/api/public/branches",
  route(async (req, res) => {
    const r = await db.query(
      "SELECT MaChiNhanh,TenChiNhanh,TrangThai FROM ChiNhanh ORDER BY MaChiNhanh",
    );
    res.json({ success: true, branches: r.recordset });
  }),
);
app.get(
  "/api/public/menu",
  route(async (req, res) =>
    res.json({
      success: true,
      products: await require("./models/productModel").catalog(
        req.query.branchId,
      ),
      toppings: await require("./models/productModel").getToppings(),
    }),
  ),
);
app.post(
  "/api/public/orders",
  route(async (req, res) => {
    auth.throttle(`online:${req.ip}`, 30, 600000);
    res.status(201).json({
      success: true,
      order: await require("./models/orderModel").createOrderTransaction(
        req.body,
        null,
        true,
      ),
      message:
        "Đã tiếp nhận đơn, chưa thanh toán. Vui lòng thanh toán tại quầy để bắt đầu pha chế.",
    });
  }),
);
app.post(
  "/api/public/quote",
  route(async (req, res) => {
    auth.throttle(`quote:${req.ip}`, 180, 60000);
    res.json({
      success: true,
      ...(await require("./models/orderModel").quote(req.body, null, true)),
    });
  }),
);
app.get(
  "/api/public/vouchers",
  route(async (req, res) =>
    res.json({
      success: true,
      vouchers: await require("./models/promoModel").available(
        req.query.branchId,
      ),
    }),
  ),
);
app.use("/api", auth.authenticate);
app.get("/api/auth/me", (req, res) =>
  res.json({ success: true, user: req.user }),
);
app.post("/api/auth/pin", route(auth.changePin));
for (const [prefix, file] of [
  ["branches", "branch"],
  ["hr", "hr"],
  ["shifts", "shift"],
  ["orders", "order"],
  ["kds", "kds"],
  ["products", "product"],

  ["promos", "promo"],
])
  app.use("/api/" + prefix, require("./routes/" + file + "Routes"));
app.get(
  "/api/reports",
  route(async (req, res) =>
    res.json({
      success: true,
      ...(await require("./models/branchModel").getReport(req.query, req.user)),
    }),
  ),
);
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "API không tồn tại." }),
);
app.use(
  "/uploads/menu",
  express.static(require("./lib/menuImage").uploadDirectory, {
    dotfiles: "deny",
    maxAge: "1d",
  }),
);
app.use(
  express.static(path.resolve(__dirname, "../../frontend"), {
    dotfiles: "deny",
    index: "index.html",
  }),
);
app.use((req, res) => res.status(404).send("Không tìm thấy trang."));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500,
    message = err.message;
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Nội dung JSON không hợp lệ.";
  } else if (
    [
      "ELOGIN",
      "ESOCKET",
      "ETIMEOUT",
      "EINSTLOOKUP",
      "ECONNCLOSED",
      "ENOTOPEN",
      "EDBCONFIG",
      "ECONNREFUSED",
    ].includes(err.code)
  ) {
    status = 503;
    message =
      "Không kết nối được SQL Server. Kiểm tra cấu hình và chạy npm run db:check.";
  } else if ([2601, 2627].includes(err.number)) {
    status = 409;
    message =
      "Dữ liệu đã tồn tại hoặc có thao tác đồng thời. Vui lòng tải lại.";
  } else if (err.number === 547) {
    status = 409;
    message =
      "Dữ liệu liên quan không tồn tại hoặc còn được sử dụng. Vui lòng kiểm tra lại lựa chọn.";
  } else if ([1205, 1222].includes(err.number)) {
    status = 409;
    message = "Dữ liệu đang được xử lý đồng thời. Vui lòng thử lại.";
  } else if (!err.status)
    message = "Lỗi xử lý trên máy chủ. Kiểm tra cửa sổ chạy backend.";
  if (status >= 500 && process.env.NODE_ENV !== "test")
    console.error("[server]", err.code || err.number || err.name);
  res.status(status).json({ success: false, message });
});
module.exports = app;
