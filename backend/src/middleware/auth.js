const { randomBytes } = require("node:crypto");
const db = require("../config/db");
const { AppError, assert } = require("../lib/errors");
const { verifyPin, hashPin, tokenHash } = require("../lib/security");
const v = require("../lib/validation");
const cookieName = "kiotcafe_session";
function token(req) {
  return (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
}
function cookie(res, value, maxAge) {
  res.cookie(cookieName, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge,
  });
}
const attempts = new Map();
function throttle(key, limit = 10, window = 15 * 60 * 1000) {
  const now = Date.now();
  if (attempts.size > 5000)
    for (const [k, x] of attempts) if (x.until < now) attempts.delete(k);
  const a = attempts.get(key) || { count: 0, until: now + window };
  if (a.until < now) {
    a.count = 0;
    a.until = now + window;
  }
  assert(
    a.count < limit,
    429,
    "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.",
  );
  a.count++;
  attempts.set(key, a);
}
async function authenticate(req, res, next) {
  try {
    const t = token(req);
    assert(t && /^[a-f0-9]{64}$/.test(t), 401, "Vui lòng đăng nhập.");
    const r = await db.query(
      `SELECT nv.MaNhanVien,nv.MaChiNhanh,nv.HoTen,vt.MaVaiTroCode AS Role FROM PhienDangNhap p JOIN NhanVien nv ON p.MaNhanVien=nv.MaNhanVien JOIN VaiTro vt ON nv.MaVaiTro=vt.MaVaiTro WHERE p.TokenHash=@hash AND p.HetHan>SYSUTCDATETIME() AND nv.TrangThai='active'`,
      { hash: tokenHash(t) },
    );
    assert(r.recordset[0], 401, "Phiên đăng nhập đã hết hạn.");
    req.user = r.recordset[0];
    next();
  } catch (err) {
    next(err);
  }
}
async function login(req, res) {
  const phone = v.phone(req.body.SoDienThoai);
  const pin = v.text(req.body.MaPIN, "Mã PIN", 12);
  assert(/^\d{6,12}$/.test(pin), 400, "Mã PIN cần 6–12 chữ số.");
  throttle(`login:${req.ip}:${phone}`);
  const r = await db.query(
    `SELECT nv.MaNhanVien,nv.MaChiNhanh,nv.HoTen,nv.MaPINHash,vt.MaVaiTroCode AS Role FROM NhanVien nv JOIN VaiTro vt ON nv.MaVaiTro=vt.MaVaiTro WHERE nv.SoDienThoai=@phone AND nv.TrangThai='active'`,
    { phone },
  );
  const user = r.recordset[0];
  // Thực hiện scrypt ngay cả khi tài khoản không tồn tại.
  const valid = verifyPin(pin, user?.MaPINHash || hashPin("000000"));
  assert(user && valid, 401, "Số điện thoại hoặc mã PIN không đúng.");
  const t = randomBytes(32).toString("hex");
  await db.query(
    `DELETE FROM PhienDangNhap WHERE HetHan<SYSUTCDATETIME(); INSERT INTO PhienDangNhap(TokenHash,MaNhanVien,HetHan) VALUES(@hash,@id,DATEADD(hour,8,SYSUTCDATETIME()))`,
    { hash: tokenHash(t), id: user.MaNhanVien },
  );
  cookie(res, t, 8 * 60 * 60 * 1000);
  delete user.MaPINHash;
  attempts.delete(`login:${req.ip}:${phone}`);
  res.json({ success: true, user });
}
async function logout(req, res) {
  const t = token(req);
  if (t)
    await db.query("DELETE FROM PhienDangNhap WHERE TokenHash=@hash", {
      hash: tokenHash(t),
    });
  cookie(res, "", 0);
  res.json({ success: true });
}
async function changePin(req, res) {
  const oldPin = v.text(req.body.OldPIN, "PIN hiện tại", 12);
  const nextPin = v.text(req.body.NewPIN, "PIN mới", 12);
  assert(/^\d{6,12}$/.test(nextPin), 400, "PIN mới cần 6–12 chữ số.");
  throttle(`pin:${req.ip}:${req.user.MaNhanVien}`);
  const r = await db.query(
    "SELECT MaPINHash FROM NhanVien WHERE MaNhanVien=@id",
    { id: req.user.MaNhanVien },
  );
  assert(
    verifyPin(oldPin, r.recordset[0]?.MaPINHash),
    403,
    "PIN hiện tại không đúng.",
  );
  await db.tx(async (tx) => {
    await db.query(
      "UPDATE NhanVien SET MaPINHash=@hash WHERE MaNhanVien=@id; DELETE FROM PhienDangNhap WHERE MaNhanVien=@id",
      { hash: hashPin(nextPin), id: req.user.MaNhanVien },
      tx,
    );
  });
  cookie(res, "", 0);
  res.json({ success: true, message: "Đã đổi PIN. Vui lòng đăng nhập lại." });
}
module.exports = { authenticate, login, logout, changePin, throttle };
