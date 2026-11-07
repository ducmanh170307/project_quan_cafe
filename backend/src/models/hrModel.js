// Mạnh: nhân viên, lịch làm việc linh hoạt và chấm công theo ca.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const { hashPin } = require("../lib/security");
const { lockBranch } = require("../lib/locks");
const schedule = require("../lib/schedule");
async function getHRByBranch(branchId, actor, query = {}) {
  const branch = access.branch(actor, branchId),
    all = access.managers.includes(actor.Role),
    id = actor.MaNhanVien,
    range = schedule.range(query);
  const staff = await db.query(
    `SELECT nv.MaNhanVien,nv.MaChiNhanh,nv.HoTen,nv.SoDienThoai,nv.LuongTheoGio,nv.TrangThai,vt.TenVaiTro,vt.MaVaiTroCode AS Role FROM NhanVien nv JOIN VaiTro vt ON nv.MaVaiTro=vt.MaVaiTro WHERE nv.MaChiNhanh=@branch AND (@all=1 OR nv.MaNhanVien=@id) ORDER BY nv.TrangThai,nv.MaNhanVien`,
    { branch, all, id },
  );
  const shifts = await db.query(
    `SELECT pc.*,nv.HoTen,cm.TenCa,CONVERT(VARCHAR(5),DATEADD(minute,420,pc.BatDauLam),108) AS GioBatDau,CONVERT(VARCHAR(5),DATEADD(minute,420,pc.KetThucLam),108) AS GioKetThuc,CONVERT(VARCHAR(10),DATEADD(minute,420,pc.KetThucLam),23) AS NgayKetThuc FROM LichPhanCa pc JOIN NhanVien nv ON pc.MaNhanVien=nv.MaNhanVien LEFT JOIN CaLamViecMau cm ON pc.MaCaMau=cm.MaCaMau WHERE pc.MaChiNhanh=@branch AND (@all=1 OR pc.MaNhanVien=@id) AND pc.BatDauLam<@end AND pc.KetThucLam>@start ORDER BY pc.BatDauLam,pc.MaNhanVien`,
    { branch, all, id, start: range.start, end: range.end },
  );
  const attendance = await db.query(
    `SELECT TOP 300 cc.*,nv.HoTen,pc.ViTriLamViec,pc.BatDauLam,pc.KetThucLam FROM BangChamCong cc JOIN NhanVien nv ON cc.MaNhanVien=nv.MaNhanVien JOIN LichPhanCa pc ON cc.MaPhanCa=pc.MaPhanCa WHERE pc.MaChiNhanh=@branch AND (@all=1 OR nv.MaNhanVien=@id) AND pc.BatDauLam<@end AND pc.KetThucLam>@start ORDER BY cc.ThoiGianCheckIn DESC`,
    { branch, all, id, start: range.start, end: range.end },
  );
  const templates = await db.query(
    "SELECT * FROM CaLamViecMau ORDER BY GioBatDau",
  );
  return {
    nhanVien: staff.recordset,
    phanCa: shifts.recordset,
    chamCong: attendance.recordset,
    caMau: templates.recordset,
    positions: schedule.POSITIONS,
    range: { from: range.from, to: range.to },
    limits: schedule.limits(),
  };
}
function staffData(data, actor) {
  const role = v.choice(
    data.Role,
    actor.Role === "ADMIN"
      ? ["ADMIN", "MANAGER", "CASHIER", "BARISTA", "STAFF"]
      : ["CASHIER", "BARISTA", "STAFF"],
    "Vai trò",
  );
  const pin = v.text(data.MaPIN, "PIN", 12, data.action === "update_staff");
  if (pin) assert(/^\d{6,12}$/.test(pin), 400, "PIN cần 6–12 chữ số.");
  return {
    name: v.text(data.HoTen, "Họ tên", 100),
    phone: v.phone(data.SoDienThoai),
    role,
    pin,
    wage: v.money(data.LuongTheoGio ?? 0, "Lương theo giờ"),
    status: v.choice(
      data.TrangThai || "active",
      ["active", "inactive"],
      "Trạng thái nhân viên",
    ),
  };
}
async function saveStaff(data, actor, branch) {
  access.role(actor, access.managers);
  const values = staffData(data, actor),
    id = data.action === "update_staff" ? v.id(data.MaNhanVien) : null;
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    if (id) {
      const current = (
        await db.query(
          "SELECT nv.*,vt.MaVaiTroCode AS Role FROM NhanVien nv WITH(UPDLOCK,HOLDLOCK) JOIN VaiTro vt ON nv.MaVaiTro=vt.MaVaiTro WHERE nv.MaNhanVien=@id AND nv.MaChiNhanh=@branch",
          { id, branch, admin: actor.Role === "ADMIN" },
          tx,
        )
      ).recordset[0];
      assert(current, 404, "Không tìm thấy nhân viên trong chi nhánh.");
      assert(
        actor.Role === "ADMIN" ||
          ["CASHIER", "BARISTA", "STAFF"].includes(current.Role),
        403,
        "Bạn không được sửa tài khoản quản lý/chủ chuỗi.",
      );
      assert(
        id !== actor.MaNhanVien || values.status === "active",
        400,
        "Không thể tự vô hiệu hóa tài khoản đang dùng.",
      );
      if (values.status === "inactive" || values.role === "ADMIN") {
        const future = await db.query(
          "SELECT TOP 1 MaPhanCa FROM LichPhanCa WHERE MaNhanVien=@id AND TrangThai IN ('scheduled','Leave_Requested') AND KetThucLam>SYSUTCDATETIME()",
          { id },
          tx,
        );
        assert(
          !future.recordset.length,
          409,
          "Hãy hủy hoặc chuyển các ca sắp tới trước khi ngừng tài khoản.",
        );
      }
    }
    const exists = await db.query(
      "SELECT MaNhanVien FROM NhanVien WITH(UPDLOCK,HOLDLOCK) WHERE SoDienThoai=@phone AND (@id IS NULL OR MaNhanVien<>@id)",
      { phone: values.phone, id },
      tx,
    );
    assert(!exists.recordset.length, 409, "Số điện thoại đã có tài khoản.");
    const params = {
      ...values,
      id,
      branch: values.role === "ADMIN" ? null : branch,
      hash: values.pin ? hashPin(values.pin) : null,
    };
    delete params.pin;
    let result;
    if (id) {
      result = await db.query(
        `UPDATE NhanVien SET HoTen=@name,SoDienThoai=@phone,MaVaiTro=(SELECT MaVaiTro FROM VaiTro WHERE MaVaiTroCode=@role),MaChiNhanh=@branch,LuongTheoGio=@wage,TrangThai=@status,MaPINHash=COALESCE(@hash,MaPINHash) OUTPUT INSERTED.MaNhanVien WHERE MaNhanVien=@id`,
        params,
        tx,
      );
      if (params.hash || values.status === "inactive")
        await db.query(
          "DELETE FROM PhienDangNhap WHERE MaNhanVien=@id",
          { id },
          tx,
        );
    } else
      result = await db.query(
        "INSERT INTO NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio,TrangThai) OUTPUT INSERTED.MaNhanVien SELECT @branch,MaVaiTro,@name,@phone,@hash,@wage,@status FROM VaiTro WHERE MaVaiTroCode=@role",
        params,
        tx,
      );
    return {
      MaNhanVien: result.recordset[0].MaNhanVien,
      message: id ? "Đã cập nhật nhân viên." : "Đã tạo nhân viên.",
    };
  });
}
async function assertEditable(tx, id, branch) {
  const row = (
    await db.query(
      "SELECT * FROM LichPhanCa WITH(UPDLOCK,HOLDLOCK) WHERE MaPhanCa=@id AND MaChiNhanh=@branch",
      { id, branch },
      tx,
    )
  ).recordset[0];
  assert(row, 404, "Không tìm thấy lịch phân ca.");
  const attended = await db.query(
    "SELECT MaChamCong FROM BangChamCong WHERE MaPhanCa=@id",
    { id },
    tx,
  );
  assert(
    !attended.recordset.length,
    409,
    "Ca đã chấm công không thể sửa hoặc hủy.",
  );
  return row;
}
async function writePlans(tx, plans, actor, branch) {
  const cache = new Map(),
    result = [];
  for (const employee of [...new Set(plans.map((p) => p.employee))].sort(
    (a, b) => a - b,
  )) {
    const staff = (
      await db.query(
        "/* hr:employee */ SELECT MaNhanVien,HoTen FROM NhanVien WITH(UPDLOCK,HOLDLOCK) WHERE MaNhanVien=@employee AND MaChiNhanh=@branch AND TrangThai='active'",
        { employee, branch },
        tx,
      )
    ).recordset[0];
    assert(
      staff,
      400,
      `Nhân viên #${employee} không thuộc chi nhánh hoặc đã ngừng làm.`,
    );
    const starts = plans
        .filter((p) => p.employee === employee)
        .map((p) => p.norm.begins),
      ends = plans
        .filter((p) => p.employee === employee)
        .map((p) => p.norm.ends);
    const from = schedule.monday(
      schedule.localDate(new Date(Math.min(...starts.map(Number)))),
    );
    const to = schedule.addDays(
      schedule.monday(
        schedule.localDate(new Date(Math.max(...ends.map(Number)) - 1)),
      ),
      7,
    );
    const rows = (
      await db.query(
        "/* hr:existing */ SELECT * FROM LichPhanCa WITH(UPDLOCK,HOLDLOCK) WHERE MaNhanVien=@employee AND BatDauLam<@end AND KetThucLam>@start AND TrangThai IN ('scheduled','Leave_Requested')",
        {
          employee,
          start: new Date(from + "T00:00:00+07:00"),
          end: new Date(to + "T00:00:00+07:00"),
        },
        tx,
      )
    ).recordset;
    cache.set(employee, { staff, rows });
  }
  for (const p of plans) {
    const { staff, rows } = cache.get(p.employee);
    try {
      schedule.validateAgainst(p.norm, rows, p.id ?? null);
    } catch (error) {
      error.message = `${staff.HoTen}: ${error.message}`;
      throw error;
    }
    const params = {
      id: p.id ?? null,
      branch,
      employee: p.employee,
      date: p.norm.date,
      begins: p.norm.begins,
      ends: p.norm.ends,
      position: p.norm.position,
      note: p.norm.note,
      template: p.norm.template,
      actor: actor.MaNhanVien,
    };
    const query = p.id
      ? `/* hr:update */ UPDATE LichPhanCa SET MaNhanVien=@employee,MaCaMau=@template,NgayLamViec=CAST(@date AS DATE),BatDauLam=@begins,KetThucLam=@ends,ViTriLamViec=@position,GhiChu=@note,NguoiCapNhat=@actor,NgayCapNhat=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE MaPhanCa=@id AND MaChiNhanh=@branch`
      : `/* hr:insert */ INSERT INTO LichPhanCa(MaChiNhanh,MaNhanVien,MaCaMau,NgayLamViec,BatDauLam,KetThucLam,ViTriLamViec,GhiChu,NguoiTao,NguoiCapNhat) OUTPUT INSERTED.* VALUES(@branch,@employee,@template,CAST(@date AS DATE),@begins,@ends,@position,@note,@actor,@actor)`;
    const saved = (await db.query(query, params, tx)).recordset[0];
    if (p.id) {
      const i = rows.findIndex((s) => s.MaPhanCa === p.id);
      if (i >= 0) rows.splice(i, 1);
    }
    rows.push(saved);
    result.push(saved);
  }
  return result;
}
async function planAction(data, actor, branch) {
  access.role(actor, access.managers);
  if (data.action === "copy_week") {
    const from = v.date(data.TuTuan),
      to = v.date(data.DenTuan);
    assert(
      schedule.monday(from) === from && schedule.monday(to) === to,
      400,
      "Chọn thứ Hai của hai tuần.",
    );
    assert(from !== to, 400, "Tuần nhận phải khác tuần nguồn.");
    return db.tx(async (tx) => {
      await lockBranch(tx, branch);
      const rows = (
        await db.query(
          `SELECT pc.* FROM LichPhanCa pc JOIN NhanVien nv ON pc.MaNhanVien=nv.MaNhanVien WHERE pc.MaChiNhanh=@branch AND pc.NgayLamViec>=CAST(@from AS DATE) AND pc.NgayLamViec<CAST(@end AS DATE) AND pc.TrangThai='scheduled' AND nv.TrangThai='active' ORDER BY pc.BatDauLam,pc.MaNhanVien`,
          { branch, from, end: schedule.addDays(from, 7) },
          tx,
        )
      ).recordset;
      assert(
        rows.length > 0 && rows.length <= 500,
        400,
        "Tuần nguồn cần có từ 1 đến 500 ca đang phân công.",
      );
      const delta = Math.round((new Date(to) - new Date(from)) / 86400000);
      const plans = rows.map((row) => {
        const start = new Date(new Date(row.BatDauLam).getTime() + 420 * 60000),
          end = new Date(new Date(row.KetThucLam).getTime() + 420 * 60000);
        return {
          employee: row.MaNhanVien,
          norm: schedule.normalize({
            NgayLamViec: schedule.addDays(
              start.toISOString().slice(0, 10),
              delta,
            ),
            GioBatDau: start.toISOString().slice(11, 16),
            GioKetThuc: end.toISOString().slice(11, 16),
            QuaDem:
              start.toISOString().slice(0, 10) !==
              end.toISOString().slice(0, 10),
            ViTriLamViec: row.ViTriLamViec,
            GhiChu: row.GhiChu,
            MaCaMau: row.MaCaMau,
          }),
        };
      });
      const saved = await writePlans(tx, plans, actor, branch);
      return {
        shifts: saved,
        message: `Đã sao chép ${saved.length} ca sang tuần ${to}.`,
      };
    });
  }
  const norm = schedule.normalize(data),
    ids = data.NhanVienIds ?? [data.MaNhanVien];
  const employees = v.list(ids, "Nhân viên", 100).map((x) => v.id(x));
  assert(
    new Set(employees).size === employees.length,
    400,
    "Danh sách nhân viên bị trùng.",
  );
  const id = data.action === "update_shift" ? v.id(data.MaPhanCa) : null;
  assert(
    !id || employees.length === 1,
    400,
    "Khi sửa ca, chọn đúng một nhân viên.",
  );
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    if (id) {
      const current = await assertEditable(tx, id, branch);
      assert(
        current.TrangThai === "scheduled",
        409,
        "Chỉ sửa ca đang phân công.",
      );
    }
    const saved = await writePlans(
      tx,
      employees.map((employee) => ({ employee, norm, id })),
      actor,
      branch,
    );
    return {
      shifts: saved,
      message: id
        ? "Đã sửa lịch làm việc."
        : `Đã phân ca cho ${saved.length} nhân viên.`,
    };
  });
}
async function attendance(data, actor, branch) {
  const employee = v.id(data.MaNhanVien);
  assert(
    access.managers.includes(actor.Role) || actor.MaNhanVien === employee,
    403,
    "Bạn chỉ được chấm công cho chính mình.",
  );
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const staff = await db.query(
      "SELECT MaNhanVien FROM NhanVien WITH(UPDLOCK,HOLDLOCK) WHERE MaNhanVien=@employee AND MaChiNhanh=@branch AND TrangThai='active'",
      { employee, branch },
      tx,
    );
    assert(staff.recordset[0], 404, "Nhân viên không thuộc chi nhánh.");
    const open = (
      await db.query(
        "SELECT * FROM BangChamCong WITH(UPDLOCK,HOLDLOCK) WHERE MaNhanVien=@employee AND ThoiGianCheckOut IS NULL",
        { employee },
        tx,
      )
    ).recordset[0];
    if (data.action === "checkin") {
      assert(!open, 409, "Đang có lượt check-in chưa check-out.");
      const slot = (
        await db.query(
          "SELECT TOP 1 * FROM LichPhanCa WITH(UPDLOCK,HOLDLOCK) WHERE MaNhanVien=@employee AND MaChiNhanh=@branch AND TrangThai='scheduled' AND BatDauLam<=DATEADD(minute,30,SYSUTCDATETIME()) AND KetThucLam>SYSUTCDATETIME() ORDER BY BatDauLam",
          { employee, branch },
          tx,
        )
      ).recordset[0];
      assert(
        slot,
        409,
        "Chưa có ca phù hợp vào lúc này. Chỉ check-in trước ca tối đa 30 phút.",
      );
      const used = await db.query(
        "SELECT MaChamCong FROM BangChamCong WHERE MaPhanCa=@shift",
        { shift: slot.MaPhanCa },
        tx,
      );
      assert(!used.recordset.length, 409, "Ca này đã được chấm công.");
      await db.query(
        `INSERT INTO BangChamCong(MaPhanCa,MaNhanVien,SoPhutDiTre) VALUES(@shift,@employee,CASE WHEN SYSUTCDATETIME()>@start THEN DATEDIFF_BIG(second,@start,SYSUTCDATETIME())/60 ELSE 0 END)`,
        { shift: slot.MaPhanCa, employee, start: slot.BatDauLam },
        tx,
      );
    } else {
      assert(open, 409, "Nhân viên chưa check-in.");
      await db.query(
        `UPDATE cc SET ThoiGianCheckOut=SYSUTCDATETIME(),SoGioLamThucTe=DATEDIFF_BIG(second,cc.ThoiGianCheckIn,SYSUTCDATETIME())/3600.0,SoPhutVeSom=CASE WHEN SYSUTCDATETIME()<pc.KetThucLam THEN DATEDIFF_BIG(second,SYSUTCDATETIME(),pc.KetThucLam)/60 ELSE 0 END FROM BangChamCong cc JOIN LichPhanCa pc ON cc.MaPhanCa=pc.MaPhanCa WHERE cc.MaChamCong=@id`,
        { id: open.MaChamCong },
        tx,
      );
    }
    return {
      message:
        data.action === "checkin"
          ? "Đã check-in theo lịch phân ca."
          : "Đã check-out và tính giờ làm thực tế.",
    };
  });
}
async function action(data, actor) {
  const branch = access.branch(actor, data.MaChiNhanh);
  if (["create_staff", "update_staff"].includes(data.action))
    return saveStaff(data, actor, branch);
  if (["assign_shift", "update_shift", "copy_week"].includes(data.action))
    return planAction(data, actor, branch);
  if (["checkin", "checkout"].includes(data.action))
    return attendance(data, actor, branch);
  if (
    ["cancel_shift", "request_leave", "approve_leave", "reject_leave"].includes(
      data.action,
    )
  ) {
    const id = v.id(data.MaPhanCa);
    return db.tx(async (tx) => {
      await lockBranch(tx, branch);
      const row = await assertEditable(tx, id, branch);
      if (data.action === "request_leave") {
        assert(
          actor.Role === "ADMIN" || row.MaNhanVien === actor.MaNhanVien,
          403,
          "Bạn chỉ được xin nghỉ cho chính mình.",
        );
        assert(
          row.TrangThai === "scheduled" &&
            new Date(row.KetThucLam) > new Date(),
          409,
          "Ca không còn nhận yêu cầu nghỉ.",
        );
        await db.query(
          "UPDATE LichPhanCa SET TrangThai='Leave_Requested',LyDoNghi=@reason,NguoiCapNhat=@actor,NgayCapNhat=SYSUTCDATETIME() WHERE MaPhanCa=@id",
          {
            id,
            actor: actor.MaNhanVien,
            reason: v.text(data.LyDoXinNghi, "Lý do xin nghỉ", 500),
          },
          tx,
        );
      } else {
        access.role(actor, access.managers);
        if (data.action === "cancel_shift") {
          assert(
            ["scheduled", "Leave_Requested"].includes(row.TrangThai),
            409,
            "Ca không còn ở trạng thái có thể hủy.",
          );
          await db.query(
            "UPDATE LichPhanCa SET TrangThai='cancelled',LyDoHuy=@reason,NguoiCapNhat=@actor,NgayCapNhat=SYSUTCDATETIME() WHERE MaPhanCa=@id",
            {
              id,
              actor: actor.MaNhanVien,
              reason: v.text(data.LyDoHuy, "Lý do hủy", 500),
            },
            tx,
          );
        } else {
          assert(
            row.TrangThai === "Leave_Requested",
            409,
            "Ca chưa có yêu cầu xin nghỉ.",
          );
          await db.query(
            "UPDATE LichPhanCa SET TrangThai=@status,NguoiCapNhat=@actor,NgayCapNhat=SYSUTCDATETIME() WHERE MaPhanCa=@id",
            {
              id,
              actor: actor.MaNhanVien,
              status: data.action === "approve_leave" ? "Absent" : "scheduled",
            },
            tx,
          );
        }
      }
      return { message: "Đã cập nhật lịch làm việc." };
    });
  }
  assert(false, 400, "Thao tác nhân sự không hợp lệ.");
}
module.exports = { getHRByBranch, action, writePlans };
