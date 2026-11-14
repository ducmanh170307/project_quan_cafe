// Phụ trách: Ý.
const router = require("express").Router();
const controller = require("../controllers/shiftController");
router.get("/", controller.getShiftStatus);
router.post("/open", controller.openShift);
router.post("/cashflow", controller.createInternalCashFlow);
router.post("/close", controller.closeShift);
module.exports = router;
