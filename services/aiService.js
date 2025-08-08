const path = require('path');
const { getAiExtraction } = require('./googleAiService');

const getOcrExtraction = async (image) => {
  console.log(`[AIService] Sending image to Google AI for extraction: ${image.filename}`);

  const imagePath = path.join(__dirname, '..', 'uploads', image.filename);

  try {
    const extractedData = await getAiExtraction(imagePath);
    console.log('[AIService] Received response from Google AI');
    return extractedData;
  } catch (error) {
    console.error('[AIService] Error calling Google AI API:', error.message);
    throw new Error('Failed to process image with Google AI');
  }
};

module.exports = { getOcrExtraction };