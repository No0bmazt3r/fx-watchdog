const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const rateService = require('../services/rateService');

// @route   GET /api/rates
// @desc    Get a summary of lowest and highest rates by date
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const summary = await rateService.getRatesSummary(req.query);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
