const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// --- Start of Standardization Helpers ---

// Load currency map from JSON file
const currencyMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../all-currencies.json'), 'utf8')
);

function standardizeDateTime(data) {
  const processedData = { ...data };

  // Standardize Date
  if (processedData.date) {
    try {
      // Handles formats like DD.MM.YY, DD/MM/YY, YYYY-MM-DD etc.
      const parts = processedData.date.match(/(\d+)/g);
      if (parts && parts.length === 3) {
        let year = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[0], 10);

        if (String(year).length === 2) {
          // Handle YY format
          year += 2000;
        }

        const date = new Date(Date.UTC(year, month, day));
        [processedData.date] = date.toISOString().split('T');
      } else {
        logger.warn(
          `Could not parse date: ${processedData.date}. Leaving as is.`
        );
      }
    } catch (e) {
      logger.warn(
        `Could not parse date: ${processedData.date}. Leaving as is.`
      );
    }
  }

  // Standardize Time
  if (processedData.time) {
    try {
      const timeMatch = processedData.time.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];
        processedData.time = `${hours}:${minutes}`;
      }
    } catch (e) {
      logger.warn(
        `Could not parse time: ${processedData.time}. Leaving as is.`
      );
    }
  }
  return processedData;
}
// --- End of Standardization Helpers ---

// Get your API key from environment variables
const genAI = new GoogleGenerativeAI(config.googleApiKey);

// Function to convert a file to a generative part
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

async function getAiExtraction(imagePath, branchName) {
  // For text-and-image input, use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const currencyMapString = JSON.stringify(currencyMap, null, 2);

  const prompt = `
    Analyze the image and extract rate card information based on the following strict rules:

    1.  **Branch Name**: The branch name MUST be "${branchName}". Do not extract it from the image.
    2.  **Date Format**: Extract the date and convert it to YYYY-MM-DD format.
    3.  **Time Format**: Extract the time and convert it to 24-hour HH:mm format.
    4.  **Currency Rate Processing**: For each currency rate on the card, you must format the key for the JSON output according to the rules below. Use this JSON object as your reference for mapping countries to currency codes:
        ${currencyMapString}

    5.  **Rate Key Formatting Rules**:
        -   **Standard**: First, find the country name in the text (e.g., "Indonesia"). Then, find its corresponding 3-letter code from the map above (e.g., "IDR"). The code is the base of the key.
        -   **Special Condition - Millions**: If the text contains "Juta", "1 Juta", "1Juta", or "Million", the key MUST be formatted as "CODE (1 Million)". For example, "1 Juta Indonesia" becomes "IDR (1 Million)".
        -   **Special Condition - Other Details**: If the text contains other details in parentheses, like "(D2B)" or "(PIN Number)", preserve them next to the code. For example, "Bangladesh (D2B)" becomes "BDT (D2B)".
        -   **Default**: If no special conditions apply, use the 3-letter code as the key.

    6.  **Final JSON Structure**: Structure the output as a single JSON object with keys "date", "time", "branch", and "rates". The value for "branch" must be "${branchName}".

    **Example of a perfect output:**
    {
      "date": "2025-07-29",
      "time": "09:30",
      "branch": "${branchName}",
      "rates": {
        "IDR": 3847.76,
        "IDR (1 Million)": 259.89,
        "PHP": 13.51,
        "BDT (D2B)": 29.06
      },
      "other_details": "Any other significant text from the image"
    }

    Return only the JSON object.
  `;

  const imagePart = fileToGenerativePart(imagePath, 'image/jpeg');

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text();

  // Clean the response to ensure it's valid JSON
  const cleanedText = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    let parsedData = JSON.parse(cleanedText);
    // Post-process date and time just in case the AI fails to format it perfectly
    parsedData = standardizeDateTime(parsedData);
    return parsedData;
  } catch (e) {
    logger.error('Error parsing JSON from AI response:', e);
    logger.error('Raw response:', cleanedText);
    throw new Error('Failed to parse AI response as JSON.');
  }
}

module.exports = { getAiExtraction };
