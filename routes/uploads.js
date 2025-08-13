const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const Upload = require('../models/upload');
const Audit = require('../models/audit');
const { getOcrExtraction, getTextExtraction } = require('../services/aiService');

const upload = multer({ dest: 'uploads/' });

// @route   POST /api/uploads
// @desc    Upload an image or text for extraction
router.post('/', auth, (req, res) => {
  // Use multer middleware manually
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: 'Image upload error' });
    }

    try {
      if (req.user.isTemporaryPassword) {
        return res.status(403).json({ msg: 'Please change your temporary password before uploading.' });
      }

      const { branch, text } = req.body;
      if (!branch) {
        return res.status(400).json({ msg: 'Branch name is required.' });
      }

      let extractedData;
      let newUpload;

      if (req.file) {
        // Image upload
        const imageBuffer = fs.readFileSync(req.file.path);
        const imageBase64 = imageBuffer.toString('base64');

        newUpload = new Upload({
          user: req.user.id,
          filename: req.file.filename,
          path: req.file.path,
          imageData: imageBase64,
          mimetype: req.file.mimetype,
        });
        await newUpload.save();

        const audit = new Audit({
          user: req.user.id,
          action: 'Upload Image for Review',
          details: `Image ${req.file.filename} for branch ${branch} uploaded for review`,
        });
        await audit.save();

        extractedData = await getOcrExtraction(req.file, branch);
      } else if (text) {
        // Text upload
        const textBase64 = Buffer.from(text).toString('base64');

        newUpload = new Upload({
          user: req.user.id,
          filename: 'text-upload.txt',
          path: null,
          imageData: textBase64,
          mimetype: 'text/plain',
        });
        await newUpload.save();

        const audit = new Audit({
          user: req.user.id,
          action: 'Upload Text for Review',
          details: `Text for branch ${branch} uploaded for review`,
        });
        await audit.save();

        extractedData = await getTextExtraction(text, branch);
      } else {
        return res.status(400).json({ msg: 'Please provide either an image or text.' });
      }

      res.json({
        uploadId: newUpload._id,
        extractedData: extractedData,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
});

// @route   GET /api/uploads
// @desc    Get all uploads (for Admins/SuperAdmins)
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, status, sortBy = 'createdAt:desc' } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const [sortField, sortOrder] = sortBy.split(':');
    const sortOptions = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

    const uploads = await Upload.find(query)
      .populate('user', 'username email')
      .populate('adminActionBy', 'username') // Populate the admin who took action
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions)
      .exec();

    const count = await Upload.countDocuments(query);

    res.json({
      uploads,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/uploads/:id
// @desc    Get a specific upload by ID
// @access  Admin/SuperAdmin
router.get('/:id', [auth, isAdminOrSuperAdmin], async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .populate('user', 'username email')
      .populate('adminActionBy', 'username');

    if (!upload) {
      return res.status(404).json({ msg: 'Upload not found.' });
    }

    res.json(upload);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Upload not found.' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PATCH /api/uploads/:id/status
// @desc    Update upload status (for Admins/SuperAdmins)
// @access  Admin/SuperAdmin
router.patch('/:id/status', [auth, isAdminOrSuperAdmin], async (req, res) => {
  try {
    const { status, message } = req.body;
    if (!['Pending', 'Completed', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status.' });
    }

    const upload = await Upload.findByIdAndUpdate(
      req.params.id,
      { status, adminMessage: message, adminActionBy: req.user.id },
      { new: true }
    );

    if (!upload) {
      return res.status(404).json({ msg: 'Upload not found.' });
    }

    // Create an audit log for the status update
    const audit = new Audit({
      user: req.user.id,
      action: `Update Upload Status to ${status}`,
      details: `Upload ${upload.filename} status changed to ${status} by ${req.user.username}. Message: ${message || 'None'}`
    });
    await audit.save();

    res.json(upload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/uploads/image/:id
// @desc    Retrieve an image by upload ID
router.get('/image/:id', auth, async (req, res) => {
  try {
    const uploadRecord = await Upload.findById(req.params.id);

    if (!uploadRecord || !uploadRecord.imageData) {
      return res.status(404).json({ msg: 'Image not found.' });
    }

    const imageBuffer = Buffer.from(uploadRecord.imageData, 'base64');
    res.set('Content-Type', uploadRecord.mimetype);
    res.send(imageBuffer);

  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Image not found.' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;