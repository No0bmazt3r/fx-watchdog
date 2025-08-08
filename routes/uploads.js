
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Upload = require('../models/upload');
const Audit = require('../models/audit');
const ExchangeRate = require('../models/exchangeRate');
const { getOcrExtraction } = require('../services/aiService');

const upload = multer({ dest: 'uploads/' });

// @route   POST /api/uploads
// @desc    Upload an image and extract rates
router.post('/', [auth, upload.single('image')], async (req, res) => {
  try {
    // Check if the user needs to change their password
    if (req.user.isTemporaryPassword) {
      return res.status(403).json({ msg: 'Please change your temporary password before uploading.' });
    }

    const newUpload = new Upload({
      user: req.user.id,
      filename: req.file.filename,
      path: req.file.path
    });

    const savedUpload = await newUpload.save();

    // Create an audit log for the upload
    const audit = new Audit({
      user: req.user.id,
      action: 'Upload Image',
      details: `Image ${req.file.filename} uploaded`
    });
    await audit.save();

    // **P2: OCR + LLM Extraction (Simulated)**
    const extractedData = await getOcrExtraction(req.file);

    // **P3: Save Rates**
    const savedRates = [];
    for (const item of extractedData) {
      const newRate = new ExchangeRate({
        upload: savedUpload._id,
        ...item
      });
      const savedRate = await newRate.save();
      savedRates.push(savedRate);
    }

    // Create an audit log for the saved rates
    const rateAudit = new Audit({
      user: req.user.id,
      action: 'Save Rates',
      details: `${savedRates.length} rates saved from upload ${savedUpload.filename}`
    });
    await rateAudit.save();

    res.json({ upload: savedUpload, rates: savedRates });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
