const axios = require('axios');
const fs = require('fs');
const path = require('path');

const getOcrExtraction = async (image) => {
  console.log(`[AIService] Sending image to local Surya OCR for extraction: ${image.filename}`);

  const imagePath = path.join(__dirname, '..', 'uploads', image.filename);
  const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

  try {
    const response = await axios.post('http://localhost:5000/api/ocr', {
      image: imageData
    });

    console.log('[AIService] Received response from local Surya OCR');
    return response.data;
  } catch (error) {
    console.error('[AIService] Error calling local Surya OCR API:', error.message);
    throw new Error('Failed to process image with local Surya OCR');
  }
};

module.exports = { getOcrExtraction };