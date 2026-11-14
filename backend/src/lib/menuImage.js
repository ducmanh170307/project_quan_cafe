const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { assert } = require("./errors");
const v = require("./validation");
const uploadDirectory = path.resolve(__dirname, "../../uploads/menu");
function imagePath(value) {
  const s = v.text(value, "Ảnh món", 500, true);
  if (!s) return "/src/assets/menu/placeholder.svg";
  if (/^\/(src\/assets\/menu|uploads\/menu)\/[A-Za-z0-9._-]+$/.test(s))
    return s;
  let url;
  try {
    url = new URL(s);
  } catch {
    assert(
      false,
      400,
      "Ảnh cần là đường dẫn ảnh của ứng dụng hoặc URL http/https.",
    );
  }
  assert(
    ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password,
    400,
    "URL ảnh không hợp lệ.",
  );
  return s;
}
function decodeUpload(data) {
  const value = v.text(data, "Dữ liệu ảnh", 3 * 1024 * 1024);
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(
      value,
    );
  assert(
    match && match[2].length % 4 === 0,
    400,
    "Chỉ nhận ảnh JPG, PNG hoặc WebP hợp lệ.",
  );
  const bytes = Buffer.from(match[2], "base64");
  assert(
    bytes.length > 12 && bytes.length <= 2 * 1024 * 1024,
    400,
    "Ảnh cần lớn hơn 12 byte và không quá 2 MB.",
  );
  let type, extension;
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    type = "image/png";
    extension = "png";
  } else if (
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217
  ) {
    type = "image/jpeg";
    extension = "jpg";
  } else if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  ) {
    type = "image/webp";
    extension = "webp";
  }
  assert(type === match[1], 400, "Nội dung ảnh không khớp định dạng khai báo.");
  return { bytes, extension };
}
async function saveUpload(data) {
  const { bytes, extension } = decodeUpload(data);
  await fs.mkdir(uploadDirectory, { recursive: true });
  const name =
    createHash("sha256").update(bytes).digest("hex") + "." + extension;
  await fs.writeFile(path.join(uploadDirectory, name), bytes, { flag: "w" });
  return "/uploads/menu/" + name;
}
module.exports = { imagePath, decodeUpload, saveUpload, uploadDirectory };
