// Phụ trách: Mạnh.
const model = require("../models/hrModel");
const { route } = require("../lib/errors");
const getHRData = route(async (req, res) =>
  res.json({
    success: true,
    ...(await model.getHRByBranch(req.query.branchId, req.user, req.query)),
  }),
);
const handleHRAction = route(async (req, res) =>
  res.json({ success: true, ...(await model.action(req.body, req.user)) }),
);
module.exports = { getHRData, handleHRAction };
