const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Audit = require('../models/audit');
const ExchangeRate = require('../models/exchangeRate');
const Upload = require('../models/upload');

// @route   POST /api/submit
// @desc    Submit extracted data for final processing
router.post(
  '/',
  [
    auth,
    [
      body('tempFileId', 'Temporary file ID is required').not().isEmpty(),
      body('extractedData', 'Extracted data is required').isObject(),
      body('extractedData.date', 'Date is required').not().isEmpty(),
      body('extractedData.time', 'Time is required').not().isEmpty(),
      body('extractedData.rates', 'Rates are required').isObject(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { tempFileId, extractedData } = req.body;
      const { date, time, branch, rates } = extractedData;
      const userId = req.user.id;

      // Find the original upload record using the tempFileId
      const upload = await Upload.findOne({ filename: tempFileId, user: userId });
      if (!upload) {
        return res.status(404).json({ msg: 'Temporary file not found or access denied.' });
      }

      // **P3: Save Rates**
      const savedRates = [];
      if (rates) {
        for (const currency of Object.keys(rates)) {
          const rate = rates[currency];
          const newRate = new ExchangeRate({
            upload: upload._id,
            date: date,
            time: time,
            branch: branch || '', // Use branch from extracted data, default to empty string
            currency: currency,
            rate: rate,
          });
          const savedRate = await newRate.save();
          savedRates.push(savedRate);
        }
      }

      // Create an audit log for the saved rates
      const rateAudit = new Audit({
        user: userId,
        action: 'Submit Verified Rates',
        details: `${savedRates.length} rates saved from upload ${upload.filename}`,
      });
      await rateAudit.save();

      // Delete the temporary file from the filesystem
      const tempFilePath = path.join(__dirname, '..', 'uploads', tempFileId);
      fs.unlink(tempFilePath, (err) => {
        if (err) {
          // Log the error but don't block the response as the main operation was successful
          console.error(`Error deleting temporary file ${tempFileId}:`, err);
        }
      });

      res.json({ msg: 'Data submitted successfully.', rates: savedRates });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;