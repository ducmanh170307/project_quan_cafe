const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/pos-init', orderController.getPOSInitData);
router.post('/orders', orderController.createOrderPOS);

module.exports = router;