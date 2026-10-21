const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');

router.get('/', hrController.getHRData);
router.post('/', hrController.handleHRAction);

module.exports = router;