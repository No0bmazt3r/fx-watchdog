const mongoose = require('mongoose');
const Upload = require('../models/upload');
const ExchangeRate = require('../models/exchangeRate');
const Audit = require('../models/audit');
const logger = require('../utils/logger');

const submitExtractedData = async (submissionData, user) => {
  const { uploadId, extractedData } = submissionData;
  const { date, time, branch, rates, extraDetails } = extractedData; // These are AI extracted

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
      const err = new Error(
        'This upload has already been submitted and completed.'
      );
      err.statusCode = 400;
      throw err;
    }

    let savedRates = [];
    if (rates && Object.keys(rates).length > 0) {
      const ratesToSave = Object.keys(rates).map((currency) => ({
        upload: upload._id,
        date: date, // Use submission date
        time: time, // Use submission time
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

    return { upload, savedRates };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = { submitExtractedData };
