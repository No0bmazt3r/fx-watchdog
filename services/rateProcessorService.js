const ExchangeRate = require('../models/exchangeRate');
const BatchRate = require('../models/batchRate');
const Branch = require('../models/branch');
const logger = require('../utils/logger');

/**
 * Determines the batch name ("Morning", "Afternoon") based on the time string.
 * @param {string} timeString - The time in "HH:mm" or "HH:mm:ss" format.
 * @returns {string|null} "Morning", "Afternoon", or null if outside batch hours.
 */
function getBatchName(timeString) {
  if (!timeString) return null;
  const hour = parseInt(timeString.split(':')[0], 10);
  if (hour >= 8 && hour < 13) {
    return 'Morning';
  }
  if (hour >= 13 && hour < 18) {
    return 'Afternoon';
  }
  return null;
}

/**
 * Processes all exchange rates, groups them by date and batch,
 * and calculates the highest and lowest rate for each currency.
 * The results are then saved or updated in the BatchRate collection.
 */
async function processAndSaveBatchRates() {
  logger.info('Starting batch rate processing for approved uploads...');

  try {
    const allRates = await ExchangeRate.aggregate([
      {
        $lookup: {
          from: 'uploads', // The name of the Upload collection
          localField: 'upload',
          foreignField: '_id',
          as: 'uploadDetails',
        },
      },
      {
        $unwind: '$uploadDetails',
      },
      {
        $match: {
          'uploadDetails.status': 'Approved',
        },
      },
    ]);
    const allBranchNames = (await Branch.find({})).map(b => b.name);
    const totalBranches = allBranchNames.length;

    if (totalBranches === 0) {
      logger.warn('No branches found in the database. Skipping processing.');
      return;
    }

    // Group rates by date and batch
    const groupedByBatch = allRates.reduce((acc, rate) => {
      const batch = getBatchName(rate.time);
      if (batch) {
        const key = `${rate.date}_${batch}`;
        if (!acc[key]) {
          acc[key] = { date: rate.date, batch, rates: [] };
        }
        acc[key].rates.push(rate);
      }
      return acc;
    }, {});

    // Process each batch
    for (const key in groupedByBatch) {
      const { date, batch, rates } = groupedByBatch[key];
      
      // Group rates by currency within the batch
      const ratesByCurrency = rates.reduce((acc, rate) => {
        if (!acc[rate.currency]) {
          acc[rate.currency] = [];
        }
        acc[rate.currency].push(rate);
        return acc;
      }, {});

      // Find highest and lowest rates for each currency
      for (const currency in ratesByCurrency) {
        const currencyRates = ratesByCurrency[currency];
        const submittedBranchesForCurrency = new Set(currencyRates.map(r => r.branch));

        if (currencyRates.length > 0) {
          const lowest = currencyRates.reduce((prev, curr) => (prev.rate < curr.rate ? prev : curr));
          const highest = currencyRates.reduce((prev, curr) => (prev.rate > curr.rate ? prev : curr));

          const submittedBranchesCount = submittedBranchesForCurrency.size;
          const isComplete = submittedBranchesCount === totalBranches;

          // Upsert the calculated batch rate
          await BatchRate.updateOne(
            { date, batch, currency },
            {
              $set: {
                highestRate: highest.rate,
                highestBranch: highest.branch,
                lowestRate: lowest.rate,
                lowestBranch: lowest.branch,
                totalBranches,
                submittedBranches: submittedBranchesCount,
                isComplete,
                branches: Array.from(submittedBranchesForCurrency),
              },
            },
            { upsert: true }
          );
        }
      }
      logger.info(`Successfully processed batch ${key}.`);
    }
  } catch (error) {
    logger.error('Error during batch rate processing:', error);
  }
}

module.exports = { processAndSaveBatchRates, getBatchName };
