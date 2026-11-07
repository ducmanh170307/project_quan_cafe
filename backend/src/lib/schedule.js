const v = require("./validation");
const { assert } = require("./errors");
const POSITIONS = ["Thu ngân", "Pha chế", "Phục vụ", "Quản lý ca", "Bếp"];
const DAY = 86400000;
const ACTIVE = ["scheduled", "Leave_Requested"];
function localDate(value = new Date()) {
  return new Date(new Date(value).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}
function addDays(value, days) {
  return new Date(new Date(v.date(value) + "T00:00:00Z").getTime() + days * DAY)
    .toISOString()
    .slice(0, 10);
}
function monday(value) {
  const date = new Date(v.date(value) + "T00:00:00Z");
  return addDays(value, -((date.getUTCDay() + 6) % 7));
}
function clock(value, label) {
  const s = v.text(value, label, 5);
  assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(s), 400, `${label} phải đúng HH:mm.`);
  return s;
}
function limits() {
  return {
    shift: v.number(
      process.env.SCHEDULE_MAX_SHIFT_HOURS ?? 12,
      "Giới hạn giờ/ca",
      { min: 1, max: 24 },
    ),
    day: v.number(
      process.env.SCHEDULE_MAX_DAY_HOURS ?? 12,
      "Giới hạn giờ/ngày",
      { min: 1, max: 24 },
    ),
    week: v.number(
      process.env.SCHEDULE_MAX_WEEK_HOURS ?? 48,
      "Giới hạn giờ/tuần",
      { min: 1, max: 168 },
    ),
  };
}
function normalize(data) {
  const date = v.date(data.NgayLamViec),
    start = clock(data.GioBatDau, "Giờ bắt đầu"),
    end = clock(data.GioKetThuc, "Giờ kết thúc");
  const overnight = data.QuaDem === true;
  assert(start !== end, 400, "Giờ bắt đầu và kết thúc phải khác nhau.");
  assert(
    end > start || overnight,
    400,
    "Ca kết thúc vào hôm sau cần bật Qua đêm.",
  );
  assert(
    !overnight || end < start,
    400,
    "Chỉ bật Qua đêm khi giờ kết thúc nhỏ hơn giờ bắt đầu.",
  );
  const begins = new Date(`${date}T${start}:00+07:00`),
    ends = new Date(`${overnight ? addDays(date, 1) : date}T${end}:00+07:00`);
  const hours = (ends - begins) / 3600000;
  assert(
    hours > 0 && hours <= limits().shift,
    400,
    `Một ca được dài tối đa ${limits().shift} giờ.`,
  );
  return {
    date,
    start,
    end,
    begins,
    ends,
    hours,
    position: v.choice(data.ViTriLamViec, POSITIONS, "Vị trí làm việc"),
    note: v.text(data.GhiChu, "Ghi chú ca", 500, true),
    template: data.MaCaMau ? v.id(data.MaCaMau) : null,
  };
}
function overlaps(a, b) {
  return (
    new Date(a.begins ?? a.BatDauLam) < new Date(b.ends ?? b.KetThucLam) &&
    new Date(b.begins ?? b.BatDauLam) < new Date(a.ends ?? a.KetThucLam)
  );
}
function validateAgainst(candidate, existing, exclude = null) {
  const rows = existing.filter(
    (s) => s.MaPhanCa !== exclude && ACTIVE.includes(s.TrangThai),
  );
  assert(
    !rows.some((s) => overlaps(candidate, s)),
    409,
    "Nhân viên đã có ca trùng hoặc chồng giờ.",
  );
  const first = localDate(candidate.begins),
    last = localDate(new Date(candidate.ends.getTime() - 1)),
    policy = limits();
  const planned = [
    ...rows.map((s) => ({
      begins: new Date(s.BatDauLam),
      ends: new Date(s.KetThucLam),
    })),
    candidate,
  ];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    const d0 = new Date(`${date}T00:00:00+07:00`),
      d1 = new Date(d0.getTime() + DAY);
    const hours = planned.reduce(
      (sum, s) =>
        sum +
        Math.max(0, Math.min(+s.ends, +d1) - Math.max(+s.begins, +d0)) /
          3600000,
      0,
    );
    assert(
      hours <= policy.day + 1e-8,
      409,
      `Nhân viên vượt ${policy.day} giờ làm trong ngày ${date}.`,
    );
  }
  for (const week of new Set([monday(first), monday(last)])) {
    const w0 = new Date(`${week}T00:00:00+07:00`),
      w1 = new Date(w0.getTime() + 7 * DAY);
    const hours = planned.reduce(
      (sum, s) =>
        sum +
        Math.max(0, Math.min(+s.ends, +w1) - Math.max(+s.begins, +w0)) /
          3600000,
      0,
    );
    assert(
      hours <= policy.week + 1e-8,
      409,
      `Nhân viên vượt ${policy.week} giờ làm trong tuần từ ${week}.`,
    );
  }
}
function range(query) {
  const from = v.date(query.from || monday(localDate())),
    to = v.date(query.to || addDays(from, 6));
  assert(
    to >= from && new Date(to) - new Date(from) <= 31 * DAY,
    400,
    "Khoảng lịch cần từ 1 đến 32 ngày.",
  );
  return {
    from,
    to,
    start: new Date(`${from}T00:00:00+07:00`),
    end: new Date(`${addDays(to, 1)}T00:00:00+07:00`),
  };
}
module.exports = {
  POSITIONS,
  ACTIVE,
  localDate,
  addDays,
  monday,
  clock,
  limits,
  normalize,
  overlaps,
  validateAgainst,
  range,
};
