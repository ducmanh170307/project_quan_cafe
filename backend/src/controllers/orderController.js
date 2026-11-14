// Phụ trách: Trúc.
const model = require("../models/orderModel");
const { route } = require("../lib/errors");
const getPOSInitData = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.getInitDataByBranch(req.query.branchId, req.user)),
  }),
);
const createOrderPOS = route(async (req, res) =>
  res.json({
    success: true,
    ...(await {
      order: await model.createOrderTransaction(req.body, req.user),
    }),
  }),
);
const listOrders = route(async (req, res) =>
  res.json({
    success: true,
    ...(await { orders: await model.list(req.query, req.user) }),
  }),
);
const payOrder = route(async (req, res) =>
  res.json({
    success: true,
    ...(await { order: await model.pay(req.body, req.user) }),
  }),
);
const cancelOrder = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.cancelAndRefundOrder(req.body, req.user)),
  }),
);
const getOrder = route(async (req, res) =>
  res.json({
    success: true,
    order: await model.detail(req.params.id, req.user),
  }),
);
const quoteOrder = route(async (req, res) =>
  res.json({ success: true, ...(await model.quote(req.body, req.user)) }),
);
const quotePayment = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.quotePayment(req.body, req.user)),
  }),
);
module.exports = {
  quoteOrder,
  quotePayment,
  getOrder,
  getPOSInitData,
  createOrderPOS,
  listOrders,
  payOrder,
  cancelOrder,
};
