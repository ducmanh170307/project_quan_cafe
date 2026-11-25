const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const db = require("../src/config/db");

const database = "CoffeeChainCafeV4_KiotCafe";
const envPath = path.resolve(__dirname, "../.env");
const sqlPath = path.resolve(__dirname, "../../database-sql/00_khoi_tao_kiotcafe.sql");

async function setup() {
  const config = db.configuration({
    database: "master",
    requestTimeout: 120000,
    pool: { min: 1, max: 1 },
  });
  if (!config.password || config.password === "DIEN_MAT_KHAU_SQL_SERVER") {
    throw new Error("Điền DB_PASSWORD của tài khoản SQL Server trong backend/.env.");
  }
  if (!existsSync(envPath)) {
    throw new Error("Tạo backend/.env từ bản đang dùng hoặc từ backend/.env.example trước.");
  }
  const sql = readFileSync(sqlPath, "utf8").replace(/^\uFEFF/, "");
  const lines = sql.split(/\r?\n/);
  const batches = [];
  let start = 0;
  for (let line = 0; line <= lines.length; line++) {
    if (line !== lines.length && !/^\s*GO\s*$/i.test(lines[line])) continue;
    const statement = lines.slice(start, line).join("\n").trimEnd();
    if (statement.trim()) batches.push({ statement, line: start + 1 });
    start = line + 1;
  }

  const pool = new db.sql.ConnectionPool(config);
  try {
    console.log(`Đang kết nối SQL Server và khởi tạo ${database}...`);
    await pool.connect();
    let summary;
    for (const [index, batch] of batches.entries()) {
      try {
        const result = await pool.request().batch(batch.statement);
        summary ??= result.recordsets.flat().find((row) => row.TenDatabase === database);
      } catch (error) {
        const details = [...(error.precedingErrors || []), error]
          .map((item) => `Msg ${item.number ?? item.code ?? "?"}, dòng trong batch ${item.lineNumber ?? "?"}: ${item.message}`)
          .join("\n");
        throw new Error(`Batch ${index + 1}, bắt đầu từ dòng ${batch.line} trong file SQL.\n${details}`);
      }
    }
    if (summary?.SoBang !== 20 || summary.SoView !== 1) {
      throw new Error("Chưa xác nhận đủ 20 bảng và 1 view sau khi khởi tạo.");
    }
    const existing = readFileSync(envPath, "utf8");
    const entry = `DB_DATABASE=${database}`;
    const eol = existing.includes("\r\n") ? "\r\n" : "\n";
    const updated = /^[ \t]*DB_DATABASE[ \t]*=/m.test(existing)
      ? existing.replace(/^[ \t]*DB_DATABASE[ \t]*=[^\r\n]*/gm, entry)
      : existing.trimEnd() + eol + entry + eol;
    if (existing !== updated) writeFileSync(envPath, updated, "utf8");
    console.log(`Cài xong ${database}: ${summary.SoBang} bảng, ${summary.SoView} view.`);
    console.log("Đã cập nhật DB_DATABASE trong backend/.env.");
  } finally {
    await pool.close().catch(() => {});
  }
}
setup().catch((error) => {
  console.error("Cài database thất bại.");
  console.error(error.message);
  process.exitCode = 1;
});
