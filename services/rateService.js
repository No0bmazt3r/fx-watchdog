const LowestRate = require('../models/lowestRate');
const HighestRate = require('../models/highestRate');

/**
 * Gets a summary of the lowest and highest rates for a given date and batch.
 * @param {object} query - The query parameters, e.g., { date: '2025-08-20', batch: '10AM' }.
 * @returns {object} A structured summary of rates grouped by currency.
 */
const getRatesSummary = async (query) => {
  const { date, batch } = query;

  const filter = {};
  if (date) filter.date = date;
  if (batch) filter.batch = batch;

  if (!date) {
    const err = new Error('A date query parameter is required.');
    err.statusCode = 400;
    throw err;
  }

  const [lowestRates, highestRates] = await Promise.all([
    LowestRate.find(filter).lean(),
    HighestRate.find(filter).lean(),
  ]);

  const summary = lowestRates.reduce((acc, lowRate) => {
    acc[lowRate.currency] = {
      lowest: {
        rate: lowRate.rate,
        branch: lowRate.branch,
      },
    };
    return acc;
  }, {});

  highestRates.forEach((highRate) => {
    if (summary[highRate.currency]) {
      summary[highRate.currency].highest = {
        rate: highRate.rate,
        branch: highRate.branch,
      };
    } else {
      // This case is unlikely if data is processed correctly, but good to handle
      summary[highRate.currency] = { highest: { rate: highRate.rate, branch: highRate.branch } };
    }
  });

  return {
    date,
    batch: batch || 'All Day',
    summary,
  };
};

module.exports = {
  getRatesSummary,
};
