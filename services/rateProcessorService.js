const ExchangeRate = require('../models/exchangeRate');
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
  }
  if (hour >= 13 && hour <= 17) {
    return '4PM';
  }
  return null;
}

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