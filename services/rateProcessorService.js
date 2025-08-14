const ExchangeRate = require('../models/exchangeRate');
const LowestRate = require('../models/lowestRate');
const HighestRate = require('../models/highestRate');
const Branch = require('../models/branch'); // Import Branch model
const logger = require('../utils/logger');

// Function to get all branches from the database
async function getAllBranches() {
  const branches = await Branch.find({});
  return branches.map(b => b.name.toUpperCase());
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

async function allBranchesExist(presentBranches) { // Make this async
  const requiredBranches = await getAllBranches(); // Get branches dynamically
  const branchSet = new Set(presentBranches.map(b => b.toUpperCase()));
  return requiredBranches.every(branch => branchSet.has(branch.toUpperCase()));
}

async function processRatesForDate(date) {
  logger.info(`Starting batch processing for date: ${date}`);

  const exchangeRates = await ExchangeRate.find({ date: date });

  // Step 1: Add batch to each rate and group by (date + batch)
  const groupedByBatch = {};

  for (const rateRow of exchangeRates) {
    const batch = getBatch(rateRow.time);
    if (!batch) {
      continue;
    }

    const key = `${rateRow.date}_${batch}`;
    if (!groupedByBatch[key]) {
      groupedByBatch[key] = [];
    }
    groupedByBatch[key].push(rateRow);
  }

  // Step 2: Process each group (one group = same date, same batch)
  for (const key in groupedByBatch) {
    const rows = groupedByBatch[key];
    const branchesInGroup = [...new Set(rows.map(r => r.branch))];

    if (!(await allBranchesExist(branchesInGroup))) { // Await the async function
      logger.info(`Skipping batch ${key} as not all branches are present.`);
      continue;
    }

    const currencyMap = {};
    for (const row of rows) {
      if (!currencyMap[row.currency]) {
        currencyMap[row.currency] = [];
      }
      currencyMap[row.currency].push(row);
    }

    // Step 3: Find lowest & highest for each currency
    for (const currency in currencyMap) {
      const currencyRows = currencyMap[currency];
      if (currencyRows.length === 0) continue;

      const lowest = currencyRows.reduce((prev, curr) => (prev.rate < curr.rate ? prev : curr));
      const highest = currencyRows.reduce((prev, curr) => (prev.rate > curr.rate ? prev : curr));
      const batch = getBatch(lowest.time); // Batch will be the same for all rows in the group

      // Use updateOne with upsert to avoid duplicates
      await LowestRate.updateOne(
        { date: lowest.date, batch: batch, currency: lowest.currency },
        {
          branch: lowest.branch,
          rate: lowest.rate,
        },
        { upsert: true }
      );

      await HighestRate.updateOne(
        { date: highest.date, batch: batch, currency: highest.currency },
        {
          branch: highest.branch,
          rate: highest.rate,
        },
        { upsert: true }
      );
    }
    logger.info(`Successfully processed batch ${key}.`);
  }
}

module.exports = { processRatesForDate };