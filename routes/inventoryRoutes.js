const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.post('/import', inventoryController.importInventory);

module.exports = router;