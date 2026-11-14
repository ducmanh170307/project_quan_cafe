const { assert } = require("./errors");
const v = require("./validation");
const managers = ["ADMIN", "MANAGER"];
const sellers = ["ADMIN", "MANAGER", "CASHIER"];
function role(actor, allowed) {
  assert(
    actor && allowed.includes(actor.Role),
    403,
    "Bạn không có quyền thực hiện thao tác này.",
  );
}
function branch(actor, branchId) {
  const n = v.id(branchId, "Chi nhánh");
  assert(
    actor && (actor.Role === "ADMIN" || actor.MaChiNhanh === n),
    403,
    "Bạn chỉ được thao tác tại chi nhánh được phân công.",
  );
  return n;
}
module.exports = { role, branch, managers, sellers };
