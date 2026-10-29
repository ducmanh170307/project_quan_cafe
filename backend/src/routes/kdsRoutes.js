const express = require('express');
const router = express.Router();
const kdsController = require('../controllers/kdsController');

router.get('/', kdsController.getKDSOrders);
router.post('/update', kdsController.updateKDSStatus);

module.exports = router;