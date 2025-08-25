/* eslint-disable prefer-destructuring */
const path = require('path');
const { getAiExtraction } = require('./googleAiService');
const currencies = require('../all-currencies.json');
const logger = require('../utils/logger');

const currencyKeys = Object.keys(currencies);

const getOcrExtraction = async (image, branchName) => {
  logger.info(
    `[AIService] Sending image to Google AI for extraction: ${image.filename}`
  );

  const imagePath = path.join(__dirname, '..', 'uploads', image.filename);

  try {
    const extractedData = await getAiExtraction(imagePath, branchName);
    logger.info('[AIService] Received response from Google AI');
    return extractedData;
  } catch (error) {
    logger.error('[AIService] Error calling Google AI API:', error.message);
    throw new Error('Failed to process image with Google AI');
  }
};

const getTextExtraction = async (text, branchName) => {
  logger.info(`[AIService] Processing raw text for extraction.`);

  const lines = text.split('\n');
  const extractedData = {
    date: '',
    branch: branchName,
    rates: {},
    extraDetails: [],
  };

  const dateRegex = /Date:(\d{2}\/d{2}\/d{4})/;
  const rateRegex = /^([A-Z .]{3,})\s*=\s*([\d.]*)$/;
  const branchRegex = /\*This rate is available only at (.+)\*/;

  lines.forEach((line) => {
    if (line) {
      let matched = false;
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        extractedData.date = dateMatch[1];
        matched = true;
      }

      const rateMatch = line.match(rateRegex);
      if (rateMatch) {
        const rawKey = rateMatch[1].trim().replace(/\.$/, '');
        const matchingKeys = currencyKeys.filter((k) =>
          k.toLowerCase().startsWith(rawKey.toLowerCase())
        );
        if (matchingKeys.length > 0) {
          matchingKeys.sort(
            (a, b) =>
              Math.abs(a.length - rawKey.length) -
              Math.abs(b.length - rawKey.length)
          );
          const currencyKey = matchingKeys[0];
          const isoCode = currencies[currencyKey];
          const value = parseFloat(rateMatch[2]);
          if (!Number.isNaN(value)) {
            extractedData.rates[isoCode] = value;
          }
        } else {
          const value = parseFloat(rateMatch[2]);
          if (!Number.isNaN(value)) {
            extractedData.rates[rawKey] = value;
          }
        }
        matched = true;
      }

      const branchMatch = line.match(branchRegex);
      if (branchMatch) {
        extractedData.branch = branchMatch[1].trim();
        matched = true;
      }

      // Match printable ASCII characters, avoiding control characters
      if (!matched && line.match(/[\x20-\x7E]/)) {
        extractedData.extraDetails.push(line.trim());
      }
    }
  });

  if (!extractedData.branch) {
    extractedData.branch = branchName;
  }

  return extractedData;
};

module.exports = { getOcrExtraction, getTextExtraction };
