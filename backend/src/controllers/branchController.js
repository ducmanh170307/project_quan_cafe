// Phụ trách: Mạnh.
const model = require("../models/branchModel");
const { route } = require("../lib/errors");
const getBranches = route(async (req, res) =>
  res.json({
    success: true,
    ...(await { branches: await model.getAllBranches(req.user) }),
  }),
);
const manageBranch = route(async (req, res) =>
  res.json({ success: true, ...(await model.manage(req.body, req.user)) }),
);
module.exports = { getBranches, manageBranch };
