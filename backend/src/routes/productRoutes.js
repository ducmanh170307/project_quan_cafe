// Phụ trách: Linh.
const router = require("express").Router();
const controller = require("../controllers/productController");
router.get("/", controller.getProducts);
router.post("/", controller.createProduct);
router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);
router.get("/toppings", controller.getToppings);
router.post("/toppings", controller.createTopping);
router.put("/toppings/:id", controller.updateTopping);
router.post("/images", controller.uploadImage);
module.exports = router;
