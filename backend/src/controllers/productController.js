// Phụ trách: Linh.
const model = require("../models/productModel");
const { route } = require("../lib/errors");
const getProducts = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.getAllProducts(req.query, req.user)),
  }),
);
const createProduct = route(async (req, res) =>
  res.json({ success: true, ...(await model.save(req.body, req.user)) }),
);
const updateProduct = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.save(req.body, req.user, req.params.id)),
  }),
);
const deleteProduct = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.deleteProduct(req.params.id, req.user)),
  }),
);
const getToppings = route(async (req, res) =>
  res.json({ success: true, toppings: await model.getToppings(req.user) }),
);
const createTopping = route(async (req, res) =>
  res.json({ success: true, ...(await model.saveTopping(req.body, req.user)) }),
);
const updateTopping = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.saveTopping(req.body, req.user, req.params.id)),
  }),
);
const uploadImage = route(async (req, res) =>
  res.json({ success: true, ...(await model.uploadImage(req.body, req.user)) }),
);
module.exports = {
  uploadImage,
  getToppings,
  createTopping,
  updateTopping,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
