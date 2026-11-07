// Phụ trách: Trúc.
const model = require("../models/kdsModel");
const { route } = require("../lib/errors");
const getKDSOrders = route(async (req, res) =>
  res.json({
    success: true,
    ...(await {
      data: await model.getActiveKDSOrders(req.query.branchId, req.user),
    }),
  }),
);
const updateKDSStatus = route(async (req, res) =>
  res.json({ success: true, ...(await model.update(req.body, req.user)) }),
);
module.exports = { getKDSOrders, updateKDSStatus };
