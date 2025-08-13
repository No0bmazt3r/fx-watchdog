const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Audit = require('../models/audit');
const ExchangeRate = require('../models/exchangeRate');
const Upload = require('../models/upload');

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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { uploadId, extractedData } = req.body;
      const { date, time, branch, rates, extraDetails } = extractedData;
      const userId = req.user.id;

      const upload = await Upload.findById(uploadId).session(session);
      if (!upload) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ msg: 'Upload record not found or access denied.' });
      }

      if (upload.status === 'Completed') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ msg: 'This upload has already been submitted and completed.' });
      }

      const savedRates = [];
      if (rates) {
        for (const currency of Object.keys(rates)) {
          const rate = rates[currency];
          const newRate = new ExchangeRate({
            upload: upload._id,
            date: date,
            time: time || '00:00',
            branch: branch || '',
            currency: currency,
            rate: rate,
          });
          const savedRate = await newRate.save({ session });
          savedRates.push(savedRate);
        }
      }

      upload.status = 'Completed';
      if (extraDetails) {
        upload.extraDetails = extraDetails;
      }
      await upload.save({ session });

      const rateAudit = new Audit({
        user: userId,
        action: 'Submit Verified Rates',
        details: `${savedRates.length} rates saved from upload ${upload.filename}`,
      });
      await rateAudit.save({ session });

      await session.commitTransaction();
      session.endSession();

      if (upload.path) {
        fs.unlink(upload.path, (err) => {
          if (err) {
            console.error(`Error deleting temporary file ${upload.path}:`, err);
          }
        });
      }

      res.json({ msg: 'Data submitted and status updated to Completed.', rates: savedRates });

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;