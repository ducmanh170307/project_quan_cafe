// Phụ trách: Trúc.
const router = require("express").Router();
const controller = require("../controllers/kdsController");
router.get("/", controller.getKDSOrders);
router.post("/update", controller.updateKDSStatus);
module.exports = router;
