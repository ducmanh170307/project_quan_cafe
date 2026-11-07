// Phụ trách: Ý.
const router = require("express").Router();
const controller = require("../controllers/promoController");
router.get("/", controller.getPromotions);
router.post("/", controller.createPromotion);
router.post("/verify", controller.verifyPromotion);
router.get("/customers", controller.getCustomers);
router.put("/:id/status", controller.setStatus);
module.exports = router;
