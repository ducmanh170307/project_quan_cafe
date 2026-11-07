const {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
function hashPin(pin, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(String(pin), salt, 64).toString("hex")}`;
}
function verifyPin(pin, stored) {
  try {
    const [salt, digest] = stored.split(":");
    const actual = scryptSync(String(pin), salt, 64);
    const expected = Buffer.from(digest, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
module.exports = { hashPin, verifyPin, tokenHash };
