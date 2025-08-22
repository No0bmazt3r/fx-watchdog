const fs = require('fs');
const Upload = require('../models/upload');
const Audit = require('../models/audit');
const { getOcrExtraction, getTextExtraction } = require('./aiService');
const logger = require('../utils/logger');
const { processAndSaveBatchRates } = require('./rateProcessorService');

const processUpload = async (file, body, user) => {
  if (user.isTemporaryPassword) {
    const err = new Error('Please change your temporary password before uploading.');
    err.statusCode = 403;
    throw err;
  }

  const { branch, text } = body;
  if (!branch) {
    const err = new Error('Branch name is required.');
    err.statusCode = 400;
    throw err;
  }

  let extractedData;
  let newUpload;

  if (file) {
    // Image upload
    const imageBuffer = fs.readFileSync(file.path);
    const imageBase64 = imageBuffer.toString('base64');

    newUpload = new Upload({
      user: user.id,
      filename: file.filename,
      path: file.path,
      imageData: imageBase64,
      mimetype: file.mimetype,
    });
    await newUpload.save();

    const audit = new Audit({
      user: user.id,
      action: 'Upload Image for Review',
      details: `Image ${file.filename} for branch ${branch} uploaded for review`,
    });
    await audit.save();

    extractedData = await getOcrExtraction(file, branch);
  } else if (text) {
    // Text upload
    const textBase64 = Buffer.from(text).toString('base64');

    newUpload = new Upload({
      user: user.id,
      filename: 'text-upload.txt',
      path: null,
      imageData: textBase64,
      mimetype: 'text/plain',
    });
    await newUpload.save();

    const audit = new Audit({
      user: user.id,
      action: 'Upload Text for Review',
      details: `Text for branch ${branch} uploaded for review`,
    });
    await audit.save();

    extractedData = await getTextExtraction(text, branch);
  } else {
    const err = new Error('Please provide either an image or text.');
    err.statusCode = 400;
    throw err;
  }

  return { uploadId: newUpload._id, extractedData };
};

const getUploads = async (query) => {
  const { page = 1, limit = 20, status, sortBy = 'createdAt:desc' } = query;
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const [sortField, sortOrder] = sortBy.split(':');
  const sortOptions = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const uploads = await Upload.find(filter)
    .populate('user', 'username email')
    .populate('adminActionBy', 'username')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sortOptions)
    .exec();

  const count = await Upload.countDocuments(filter);

  return { uploads, totalPages: Math.ceil(count / limit), currentPage: page };
};

const getUploadById = async (id) => {
  const upload = await Upload.findById(id)
    .populate('user', 'username email')
    .populate('adminActionBy', 'username');

  if (!upload) {
    const err = new Error('Upload not found.');
    err.statusCode = 404;
    throw err;
  }

  return upload;
};

const updateUploadStatus = async (id, status, message, user) => {
  if (!['Pending', 'Completed', 'Approved', 'Rejected'].includes(status)) {
    const err = new Error('Invalid status.');
    err.statusCode = 400;
    throw err;
  }

  const upload = await Upload.findByIdAndUpdate(
    id,
    { status, adminMessage: message, adminActionBy: user.id },
    { new: true }
  );

  if (!upload) {
    const err = new Error('Upload not found.');
    err.statusCode = 404;
    throw err;
  }

  const audit = new Audit({
    user: user.id,
    action: `Update Upload Status to ${status}`,
    details: `Upload ${upload.filename} status changed to ${status} by ${user.username}. Message: ${message || 'None'}`,
  });
  await audit.save();

  if (status === 'Approved') {
    processAndSaveBatchRates().catch(err => {
      logger.error('Error during background batch processing:', err);
    });
  }

  return upload;
};

const getUploadImage = async (id) => {
  const uploadRecord = await Upload.findById(id);

  if (!uploadRecord || !uploadRecord.imageData) {
    const err = new Error('Image not found.');
    err.statusCode = 404;
    throw err;
  }

  return uploadRecord;
};

const getUploadHistory = async (userId, query) => {
  const { page = 1, limit = 20, status, sortBy = 'createdAt:desc' } = query;
  const filter = { user: userId }; // Filter by the current user's ID
  if (status) {
    filter.status = status;
  }

  const [sortField, sortOrder] = sortBy.split(':');
  const sortOptions = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const uploads = await Upload.find(filter)
    .populate('user', 'username email')
    .populate('adminActionBy', 'username')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sortOptions)
    .exec();

  const count = await Upload.countDocuments(filter);

  return { uploads, totalPages: Math.ceil(count / limit), currentPage: page };
};

const getLatestUpload = async (userId = null) => {
  const filter = {};
  if (userId) {
    filter.user = userId;
  }

  const latestUpload = await Upload.findOne(filter)
    .sort({ createdAt: -1 }) // Sort by creation date in descending order
    .populate('user', 'username email')
    .populate('adminActionBy', 'username')
    .exec();

  return latestUpload;
};

const discardLastUpload = async (userId) => {
  const latestUpload = await Upload.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .exec();

  if (!latestUpload) {
    const err = new Error('No uploads found to discard.');
    err.statusCode = 404;
    throw err;
  }

  // Mark the latest upload as Rejected
  latestUpload.status = 'Rejected';
  await latestUpload.save();

  const audit = new Audit({
    user: userId,
    action: 'Discard Last Upload',
    details: `User ${userId} discarded their last upload (${latestUpload.filename}).`,
  });
  await audit.save();

  return latestUpload;
};

module.exports = {
  processUpload,
  getUploads,
  getUploadById,
  updateUploadStatus,
  getUploadImage,
  getUploadHistory,
  getLatestUpload,
  discardLastUpload,
};
