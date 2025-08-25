const express = require('express');

const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const uploadService = require('../services/uploadService');

const uploader = multer({ dest: 'uploads/' });

// @route   POST /api/uploads
// @desc    Upload an image or text for extraction
router.post('/', [auth, uploader.single('image')], async (req, res, next) => {
  try {
    const { uploadId, extractedData } = await uploadService.processUpload(
      req.file,
      req.body,
      req.user
    );
    res.json({
      uploadId,
      extractedData,
    });
  } catch (err) {
    // If multer threw an error, it might be passed here as well
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
});

// @route   GET /api/uploads
// @desc    Get all uploads (for Admins/SuperAdmins)
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const { uploads, totalPages, currentPage } = await uploadService.getUploads(
      req.query
    );
    res.json({
      uploads,
      totalPages,
      currentPage,
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/uploads/history
// @desc    Get upload history for the authenticated user
// @access  Private
router.get('/history', auth, async (req, res, next) => {
  try {
    const { uploads, totalPages, currentPage } =
      await uploadService.getUploadHistory(req.user.id, req.query);
    res.json({
      uploads,
      totalPages,
      currentPage,
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/uploads/latest
// @desc    Get the latest upload for the authenticated user or globally
// @access  Private
router.get('/latest', auth, async (req, res, next) => {
  try {
    const latestUpload = await uploadService.getLatestUpload(req.user.id); // Get latest for current user
    if (!latestUpload) {
      return res.status(404).json({ msg: 'No uploads found.' });
    }
    res.json(latestUpload);
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/uploads/last
// @desc    Discard the last uploaded item for the authenticated user
// @access  Private
router.delete('/last', auth, async (req, res, next) => {
  try {
    const discardedUpload = await uploadService.discardLastUpload(req.user.id);
    res.json({
      msg: 'Last upload discarded successfully.',
      upload: discardedUpload,
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/uploads/image/:id
// @desc    Retrieve an image by upload ID
router.get('/image/:id', auth, async (req, res, next) => {
  try {
    const uploadRecord = await uploadService.getUploadImage(req.params.id);
    const imageBuffer = Buffer.from(uploadRecord.imageData, 'base64');
    res.set('Content-Type', uploadRecord.mimetype);
    res.send(imageBuffer);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/uploads/:id
// @desc    Get a specific upload by ID
// @access  Admin/SuperAdmin
router.get('/:id', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const upload = await uploadService.getUploadById(req.params.id);
    res.json(upload);
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/uploads/:id/status
// @desc    Update upload status (for Admins/SuperAdmins)
// @access  Admin/SuperAdmin
router.patch(
  '/:id/status',
  [auth, isAdminOrSuperAdmin],
  async (req, res, next) => {
    try {
      const { status, message } = req.body;
      const upload = await uploadService.updateUploadStatus(
        req.params.id,
        status,
        message,
        req.user
      );
      res.json(upload);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
