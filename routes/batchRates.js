const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const batchRateService = require('../services/batchRateService');

// @route   GET /api/batch-rates
// @desc    Get batch rates, with optional filtering by date and batch
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const { date, batch } = req.query;
    const filters = {};
    if (date) filters.date = date;
    if (batch) filters.batch = batch;

    const batchRates = await batchRateService.getBatchRates(filters);
    res.json(batchRates);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
