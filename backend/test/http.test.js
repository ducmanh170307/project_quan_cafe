const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
const db = require("../src/config/db"),
  app = require("../src/app"),
  { hashPin } = require("../src/lib/security");
let server,
  base,
  actor = { MaNhanVien: 3, MaChiNhanh: 1, Role: "CASHIER", HoTen: "Thu ngân" };
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));
const auth = { cookie: "kiotcafe_session=" + "a".repeat(64) };
const post = (url, body, headers = auth) =>
  fetch(base + url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach((t) => {
  t.mock.method(db, "query", async (sql, params) => {
    if (sql.includes("FROM PhienDangNhap p"))
      return { recordset: [{ ...actor }] };
    if (sql.includes("schemaVersion"))
      return { recordset: [{ schemaVersion: 4, seedVersion: 4 }] };
    throw new Error("Unexpected database call: " + sql.slice(0, 60));
  });
});
test("Giao diện và JS/CSS được phục vụ trên cùng cổng", async () => {
  for (const path of [
    "/",
    "/order.html",
    "/src/main.js",
    "/src/assets/style.css",
  ])
    assert.equal((await fetch(base + path)).status, 200);
});
test("API riêng yêu cầu đăng nhập dù client gửi Role=ADMIN", async () => {
  const r = await post(
    "/api/hr",
    { Role: "ADMIN", action: "assign_shift" },
    {},
  );
  assert.equal(r.status, 401);
  assert.equal((await r.json()).success, false);
});
test("Cashier không thể giả vai trò ADMIN để tự phân ca", async () => {
  const r = await post("/api/hr", {
    MaChiNhanh: 1,
    action: "assign_shift",
    Role: "ADMIN",
  });
  assert.equal(r.status, 403);
});
test("Không thao tác chéo chi nhánh qua body", async () => {
  const r = await post("/api/shifts/open", {
    MaChiNhanh: 2,
    TienMatDauCa: 100,
  });
  assert.equal(r.status, 403);
});
test("Thao tác không tồn tại trả JSON 400, không treo request", async () => {
  const r = await post("/api/hr", { MaChiNhanh: 1, action: "typo" });
  assert.equal(r.status, 400);
  assert.match((await r.json()).message, /không hợp lệ/);
});
test("API không tồn tại trả JSON 404", async () => {
  const r = await fetch(base + "/api/does-not-exist", { headers: auth });
  assert.equal(r.status, 404);
  assert.match(r.headers.get("content-type"), /json/);
});
test("JSON hỏng và yêu cầu khác origin bị từ chối", async () => {
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{oops",
  });
  assert.equal(r.status, 400);
  const x = await post(
    "/api/auth/login",
    {},
    { origin: "https://evil.example" },
  );
  assert.equal(x.status, 403);
});
test("Đơn online không tin giỏ rỗng hoặc chi nhánh sai định dạng", async () => {
  const r = await post(
    "/api/public/orders",
    { MaChiNhanh: "xyz", Items: [] },
    {},
  );
  assert.equal(r.status, 400);
});
test("Chẩn đoán trả 503, không lộ lỗi SQL hoặc mật khẩu", async (t) => {
  t.mock.method(db, "query", async () => {
    throw Object.assign(new Error("secret-password"), { code: "ELOGIN" });
  });
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes("secret-password"));
});
test("Đăng nhập tạo cookie HttpOnly, giữ vai trò trên server, không lộ hash", async (t) => {
  const stored = [];
  t.mock.method(db, "query", async (sql, p) => {
    if (sql.includes("nv.MaPINHash"))
      return { recordset: [{ ...actor, MaPINHash: hashPin("111111") }] };
    stored.push(p);
    return { recordset: [] };
  });
  const r = await post(
    "/api/auth/login",
    { SoDienThoai: "0902000001", MaPIN: "111111", Role: "ADMIN" },
    {},
  );
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  assert.match(r.headers.get("set-cookie"), /SameSite=Strict/);
  const data = await r.json();
  assert.equal(data.user.Role, "CASHIER");
  assert.equal(data.user.MaPINHash, undefined);
  assert.equal(stored[0].hash.length, 64);
  assert.ok(!r.headers.get("set-cookie").includes(stored[0].hash));
});
test("Tài nguyên không tồn tại không bị trả nhầm index.html", async () => {
  const r = await fetch(base + "/missing.js");
  assert.equal(r.status, 404);
  assert.equal((await fetch(base + "/backend/.env")).status, 404);
});

test("Đường dẫn chức năng đã bỏ trả JSON 404", async () => {
  const r = await fetch(base + "/api/inventory", { headers: auth });
  assert.equal(r.status, 404);
  assert.equal((await r.json()).success, false);
});
test("Thu ngân không thể tải ảnh menu", async () => {
  const r = await post("/api/products/images", { HinhAnhData: "invalid" });
  assert.equal(r.status, 403);
});
test("Health kiểm tra schema và dữ liệu mẫu phiên bản 4", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).schemaVersion, 4);
});

test("Ảnh được tải lên và phục vụ lại đúng byte cho chủ chuỗi", async (t) => {
  t.mock.method(db, "query", async () => ({
    recordset: [{ ...actor, Role: "ADMIN" }],
  }));
  const fs = require("node:fs/promises"),
    path = require("node:path"),
    crypto = require("node:crypto");
  const bytes = Buffer.concat([
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=",
      "base64",
    ),
    crypto.randomBytes(16),
  ]);
  const r = await post("/api/products/images", {
    HinhAnhData: "data:image/png;base64," + bytes.toString("base64"),
  });
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.match(data.HinhAnh, /^\/uploads\/menu\/[a-f0-9]{64}\.png$/);
  t.after(() =>
    fs
      .unlink(
        path.join(
          require("../src/lib/menuImage").uploadDirectory,
          data.HinhAnh.split("/").at(-1),
        ),
      )
      .catch(() => {}),
  );
  const image = await fetch(base + data.HinhAnh);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /image\/png/);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
});
