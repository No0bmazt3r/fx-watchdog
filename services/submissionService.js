const mongoose = require('mongoose');
const Upload = require('../models/upload');
const ExchangeRate = require('../models/exchangeRate');
const Audit = require('../models/audit');
const { processAndSaveBatchRates } = require('./rateProcessorService');
const logger = require('../utils/logger');

const submitExtractedData = async (submissionData, user) => {
  const { uploadId, extractedData } = submissionData;
  const { date, time, branch, rates, extraDetails } = extractedData; // These are AI extracted

  // Capture current system date and time
  const now = new Date();
  const submissionDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const submissionTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const upload = await Upload.findById(uploadId).session(session);
    if (!upload) {
      const err = new Error('Upload record not found or access denied.');
      err.statusCode = 404;
      throw err;
    }

    if (upload.status === 'Completed') {
      const err = new Error('This upload has already been submitted and completed.');
      err.statusCode = 400;
      throw err;
    }

    let savedRates = [];
    if (rates && Object.keys(rates).length > 0) {
      const ratesToSave = Object.keys(rates).map((currency) => ({
        upload: upload._id,
        date: submissionDate, // Use submission date
        time: submissionTime, // Use submission time
        branch: branch || '',
        currency,
        rate: rates[currency],
      }));
      savedRates = await ExchangeRate.insertMany(ratesToSave, { session });
    }

    upload.status = 'Completed';
    if (extraDetails) {
      upload.extraDetails = extraDetails;
    }
    await upload.save({ session });

    const rateAudit = new Audit({
      user: user.id,
      action: 'Submit Verified Rates',
      details: `${savedRates.length} rates saved from upload ${upload.filename}`,
    });
    await rateAudit.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Asynchronously trigger batch processing. No need to wait for it.
    processAndSaveBatchRates().catch(err => {
      logger.error('Error during background batch processing:', err);
    });

    return { upload, savedRates };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = { submitExtractedData };
