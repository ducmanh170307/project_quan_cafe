const { test } = require("node:test"),
  assert = require("node:assert/strict");
const images = require("../src/lib/menuImage");
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=";
test("Nhận ảnh PNG hợp lệ và đường dẫn nội bộ/https", () => {
  assert.equal(images.decodeUpload(png).extension, "png");
  assert.equal(
    images.imagePath("/src/assets/menu/latte.jpg"),
    "/src/assets/menu/latte.jpg",
  );
  assert.equal(
    images.imagePath("https://example.com/coffee.jpg"),
    "https://example.com/coffee.jpg",
  );
});
test("Không nhận SVG, nội dung sai MIME hoặc ảnh quá lớn", () => {
  for (const data of [
    "data:image/svg+xml;base64,PHN2Zz4=",
    png.replace("image/png", "image/jpeg"),
    "data:image/png;base64," +
      Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"),
  ])
    assert.throws(() => images.decodeUpload(data), { status: 400 });
});
test("Chặn URL thực thi mã và đường dẫn đi ra ngoài thư mục ảnh", () => {
  for (const data of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "/uploads/menu/../../secret",
    "https://user:password@example.com/a.jpg",
  ])
    assert.throws(() => images.imagePath(data), { status: 400 });
  assert.equal(images.imagePath(""), "/src/assets/menu/placeholder.svg");
});
