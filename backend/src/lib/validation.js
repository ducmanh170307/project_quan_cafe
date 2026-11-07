const { assert } = require("./errors");
const text = (v, label, max = 200, optional = false) => {
  if (optional && (v === undefined || v === null || v === "")) return "";
  assert(typeof v === "string", 400, `${label} phải là chuỗi.`);
  const s = v.trim();
  assert(
    s.length > 0 && s.length <= max,
    400,
    `${label} cần từ 1 đến ${max} ký tự.`,
  );
  return s;
};
const number = (v, label, { min = 0, max = 1e12, integer = false } = {}) => {
  assert(
    (typeof v === "number" || typeof v === "string") && String(v).trim() !== "",
    400,
    `${label} không được để trống.`,
  );
  const n = Number(v);
  assert(
    Number.isFinite(n) &&
      n >= min &&
      n <= max &&
      (!integer || Number.isSafeInteger(n)),
    400,
    `${label} không hợp lệ (từ ${min} đến ${max}${integer ? ", số nguyên" : ""}).`,
  );
  return n;
};
const id = (v, label = "Mã") =>
  number(v, label, { min: 1, max: 2147483647, integer: true });
const money = (v, label = "Số tiền", min = 0) =>
  number(v, label, { min, integer: true });
const choice = (v, options, label) => {
  assert(options.includes(v), 400, `${label} không hợp lệ.`);
  return v;
};
const phone = (v, optional = false) => {
  const s = text(v, "Số điện thoại", 11, optional);
  assert(
    (optional && !s) || /^0\d{9,10}$/.test(s),
    400,
    "Số điện thoại phải có 10–11 chữ số và bắt đầu bằng 0.",
  );
  return s;
};
const date = (v) => {
  const s = text(v, "Ngày", 10);
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    400,
    "Ngày phải đúng định dạng YYYY-MM-DD.",
  );
  return s;
};
const list = (v, label, max = 100) => {
  assert(
    Array.isArray(v) && v.length > 0 && v.length <= max,
    400,
    `${label} cần từ 1 đến ${max} phần tử.`,
  );
  return v;
};
const uuid = (v) => {
  assert(
    typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v,
      ),
    400,
    "Thiếu mã chống tạo đơn trùng hợp lệ.",
  );
  return v.toLowerCase();
};
const object = (value, label = "Dữ liệu") => {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    400,
    `${label} phải là object.`,
  );
  return value;
};
module.exports = {
  object,
  text,
  number,
  id,
  money,
  choice,
  phone,
  date,
  list,
  uuid,
};
