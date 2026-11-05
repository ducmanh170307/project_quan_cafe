// Phụ trách: Mạnh.
const router = require("express").Router();
const controller = require("../controllers/branchController");
router.get("/", controller.getBranches);
router.post("/", controller.manageBranch);
module.exports = router;
