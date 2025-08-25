const ExchangeRate = require('../models/exchangeRate');
<<<<<<< Updated upstream
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
=======
const LowestRate = require('../models/lowestRate');
const HighestRate = require('../models/highestRate');
const Branch = require('../models/branch');
const logger = require('../utils/logger');

// Function to get all branches from the database
async function getAllBranches() {
  const branches = await Branch.find({}).lean(); // Use .lean() for faster read-only queries
  return branches.map((b) => b.name.toUpperCase());
}

function getBatch(time) {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 8 && hour <= 12) {
    return '10AM';
>>>>>>> Stashed changes
  }
  if (hour >= 13 && hour < 18) {
    return 'Afternoon';
  }
  return null;
}

<<<<<<< Updated upstream
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
=======
async function allBranchesExist(presentBranches, requiredBranches) {
  const branchSet = new Set(presentBranches.map((b) => b.toUpperCase()));
  return requiredBranches.every((branch) => branchSet.has(branch));
}

async function processRatesForDate(date) {
  logger.info(`Starting batch processing for date: ${date}`);

  const [exchangeRates, requiredBranches] = await Promise.all([
    ExchangeRate.find({ date }).lean(), // Use .lean() for performance
    getAllBranches(),
  ]);

  // Step 1: Add batch to each rate and group by (date + batch)
  const groupedByBatch = exchangeRates.reduce((acc, rateRow) => {
    const batch = getBatch(rateRow.time);
    if (!batch) {
      return acc;
    }

    const key = `${rateRow.date}_${batch}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rateRow);
    return acc;
  }, {});

  // Step 2: Process each group (one group = same date, same batch)
  const processingPromises = Object.entries(groupedByBatch).map(
    async ([key, rows]) => {
      const branchesInGroup = [...new Set(rows.map((r) => r.branch))];

      if (!(await allBranchesExist(branchesInGroup, requiredBranches))) {
        logger.info(`Skipping batch ${key} as not all branches are present.`);
        return; // Skip this batch
      }

      const currencyMap = rows.reduce((acc, row) => {
        if (!acc[row.currency]) {
          acc[row.currency] = [];
        }
        acc[row.currency].push(row);
        return acc;
      }, {});

      // Step 3: Find lowest & highest for each currency and update the database
      const updatePromises = Object.entries(currencyMap).map(
        ([currency, currencyRows]) => {
          if (currencyRows.length === 0) return null;

          const lowest = currencyRows.reduce((prev, curr) =>
            prev.rate < curr.rate ? prev : curr
          );
          const highest = currencyRows.reduce((prev, curr) =>
            prev.rate > curr.rate ? prev : curr
          );
          const batch = getBatch(lowest.time);

          const lowestRatePromise = LowestRate.updateOne(
            { date: lowest.date, batch, currency },
            { branch: lowest.branch, rate: lowest.rate },
            { upsert: true }
          );

          const highestRatePromise = HighestRate.updateOne(
            { date: highest.date, batch, currency },
            { branch: highest.branch, rate: highest.rate },
            { upsert: true }
          );

          return Promise.all([lowestRatePromise, highestRatePromise]);
        }
      );

      await Promise.all(updatePromises.filter((p) => p !== null));
      logger.info(`Successfully processed batch ${key}.`);
    }
  );

  await Promise.all(processingPromises);
}

module.exports = { processRatesForDate };
>>>>>>> Stashed changes
