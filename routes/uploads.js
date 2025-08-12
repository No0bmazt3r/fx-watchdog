
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const auth = require('../middleware/auth');
const Upload = require('../models/upload');
const Audit = require('../models/audit');
const { getOcrExtraction } = require('../services/aiService');

const upload = multer({ dest: 'uploads/' });

// @route   POST /api/uploads
// @desc    Upload an image for OCR extraction and save it to the database
router.post('/', [auth, upload.single('image')], async (req, res) => {
  try {
    if (req.user.isTemporaryPassword) {
      return res.status(403).json({ msg: 'Please change your temporary password before uploading.' });
    }

    // Validate that a branch name is provided
    const { branch } = req.body;
    if (!branch) {
      return res.status(400).json({ msg: 'Branch name is required.' });
    }

    // Read the image file and convert it to Base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');

    // Create a record of the upload with image data and mimetype
    const newUpload = new Upload({
      user: req.user.id,
      filename: req.file.filename,
      path: req.file.path,
      imageData: imageBase64, // Save the Base64 string
      mimetype: req.file.mimetype, // Save the mimetype
    });
    await newUpload.save();

    // Create an audit log for the upload
    const audit = new Audit({
      user: req.user.id,
      action: 'Upload Image for Review',
      details: `Image ${req.file.filename} for branch ${branch} uploaded for review`,
    });
    await audit.save();

    // Perform OCR extraction, passing in the branch name
    const extractedData = await getOcrExtraction(req.file, branch);

    // Return the extracted data and the temporary file ID
    res.json({
      tempFileId: req.file.filename,
      uploadId: newUpload._id, // Return the new upload ID for image retrieval
      extractedData: extractedData,
    });
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

    // Decode the Base64 string to a buffer and send it as an image
    const imageBuffer = Buffer.from(uploadRecord.imageData, 'base64');
    res.set('Content-Type', uploadRecord.mimetype); // Use the stored mimetype
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
