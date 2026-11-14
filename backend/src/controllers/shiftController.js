// Phụ trách: Ý.
const model = require("../models/shiftModel");
const { route } = require("../lib/errors");
const getShiftStatus = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.getShiftByBranch(req.query.branchId, req.user)),
  }),
);
const openShift = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.createOpenShift(req.body, req.user)),
  }),
);
const createInternalCashFlow = route(async (req, res) =>
  res.json({ success: true, ...(await model.addCashFlow(req.body, req.user)) }),
);
const closeShift = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.closeShiftRecord(req.body, req.user)),
  }),
);
module.exports = {
  getShiftStatus,
  openShift,
  createInternalCashFlow,
  closeShift,
};
