// Phụ trách: Trúc.
const router = require("express").Router();
const controller = require("../controllers/orderController");
router.get("/pos-init", controller.getPOSInitData);
router.get("/", controller.listOrders);
router.post("/", controller.createOrderPOS);
router.post("/pay", controller.payOrder);
router.post("/cancel", controller.cancelOrder);
router.get("/:id", controller.getOrder);
router.post("/quote", controller.quoteOrder);
router.post("/quote-payment", controller.quotePayment);
module.exports = router;
