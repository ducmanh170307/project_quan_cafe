const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
let files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
}
walk(path.join(root, "backend/src"));
walk(path.join(root, "backend/scripts"));
walk(path.join(root, "backend/test"));
walk(path.join(root, "frontend/src"));
let errors = 0;
for (const file of files) {
  const r = spawnSync(
    process.execPath,
    file.includes(path.sep + "frontend" + path.sep)
      ? ["--check", "--input-type=module"]
      : ["--check", file],
    {
      encoding: "utf8",
      ...(file.includes(path.sep + "frontend" + path.sep)
        ? { input: fs.readFileSync(file, "utf8") }
        : {}),
    },
  );
  if (r.status) {
    errors++;
    console.error(r.stderr);
  }
}
for (const html of ["index.html", "order.html"]) {
  const file = path.join(root, "frontend", html),
    source = fs.readFileSync(file, "utf8");
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  if (new Set(ids).size !== ids.length) {
    errors++;
    console.error("Trùng id trong", html);
  }
  for (const [, url] of source.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (
      !/^(https?:|\/)/.test(url) &&
      !fs.existsSync(path.join(path.dirname(file), url))
    ) {
      errors++;
      console.error("Thiếu tài nguyên", url);
    }
  }
}
console.log(
  `Đã kiểm tra cú pháp ${files.length} file JavaScript và tài nguyên HTML. Lỗi: ${errors}`,
);
process.exitCode = errors ? 1 : 0;
