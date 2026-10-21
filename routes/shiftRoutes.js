const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

router.get('/', shiftController.getShiftStatus);
router.post('/open', shiftController.openShift);
router.post('/cashflow', shiftController.createInternalCashFlow);
router.post('/close', shiftController.closeShift);

module.exports = router;