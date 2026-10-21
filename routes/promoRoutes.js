const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');

router.post('/', promoController.createPromotion);

module.exports = router;