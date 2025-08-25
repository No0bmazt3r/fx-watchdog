const BatchRate = require('../models/batchRate');

/**
 * Get batch rates with optional filters
 * @param {object} filters - Optional filters for date and batch
 * @returns {Promise<BatchRate[]>}
 */
const getBatchRates = async (filters = {}) => {
  try {
    const query = {};
    if (filters.date) {
      query.date = filters.date;
    }
    if (filters.batch) {
      query.batch = filters.batch;
    }

    const batchRates = await BatchRate.find(query).sort({ createdAt: -1 });
    return batchRates;
  } catch (error) {
    throw new Error('Error fetching batch rates');
  }
};

module.exports = {
  getBatchRates,
};
