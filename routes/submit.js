const express = require('express');

const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const auth = require('../middleware/auth');
const submissionService = require('../services/submissionService');

// @route   POST /api/submit
// @desc    Submit extracted data for final processing and update status
router.post(
  '/',
  [
    auth,
    [
      body('uploadId', 'Upload ID is required').not().isEmpty(),
      body('extractedData', 'Extracted data is required').isObject(),
      body('extractedData.date', 'Date is required').not().isEmpty(),
      body('extractedData.rates', 'Rates are required').isObject(),
    ],
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { upload, savedRates } =
        await submissionService.submitExtractedData(req.body, req.user);

      // Asynchronously delete the temporary file if it exists
      if (upload.path) {
        fs.unlink(upload.path, (err) => {
          if (err) {
            console.error(`Error deleting temporary file ${upload.path}:`, err);
          }
        });
      }

      res.json({
        msg: 'Data submitted and status updated to Completed.',
        rates: savedRates,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
