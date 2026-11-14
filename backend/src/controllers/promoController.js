// Phụ trách: Ý.
const model = require("../models/promoModel");
const { route } = require("../lib/errors");
const getPromotions = route(async (req, res) =>
  res.json({
    success: true,
    ...(await { promos: await model.list(req.user) }),
  }),
);
const createPromotion = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.insertPromotion(req.body, req.user)),
  }),
);
const verifyPromotion = route(async (req, res) =>
  res.json({ success: true, ...(await model.verify(req.body)) }),
);
const getCustomers = route(async (req, res) =>
  res.json({
    success: true,
    customers: await model.customers(req.query.branchId, req.user),
  }),
);
const setStatus = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.setStatus(req.params.id, req.body, req.user)),
  }),
);
module.exports = {
  setStatus,
  getCustomers,
  getPromotions,
  createPromotion,
  verifyPromotion,
};
