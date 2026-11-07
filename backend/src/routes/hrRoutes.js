// Phụ trách: Mạnh.
const router = require("express").Router();
const controller = require("../controllers/hrController");
router.get("/", controller.getHRData);
router.post("/", controller.handleHRAction);
module.exports = router;
