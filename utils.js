import axios from "axios";
import AdmZip from "adm-zip";
import { finished } from "stream/promises";
import { createWriteStream } from "fs";
import { isSameDay } from "date-fns";

export const downloadFile = async (url, outputLocation) => {
  console.log(url);
  const writer = createWriteStream(outputLocation);

  const result = await axios({
    url,
    method: "GET",
    responseType: "stream",
  }).then((result) => result.data);

  result.pipe(writer);
  return await finished(writer);
};

export const unzipFile = (zipFile, fileToExtract, outputLocation) => {
  const zip = new AdmZip(zipFile);
  return zip.extractEntryTo(fileToExtract, outputLocation, true);
};

/**
 * @description Read the csv file line by line and process the data
 * @param {import('readline').Interface} readByLine
 * @returns {Promise<Object>}
 */
export const processCSV = async ({ readByLine, argv, processingFn }) => {
  console.log("Processing file...");
  let LINE_COUNTER = 0;
  let portfolioValue = {};
  let startTimestamp = 0;
  let columnIndexes = {};

  return new Promise((resolve, reject) => {
    readByLine
      .on("line", (line) => {
        LINE_COUNTER += 1;
        if (LINE_COUNTER === 1) {
          columnIndexes = getColumnIndex(line);
          return;
        }
        const lineValue = getLineValue(line, columnIndexes);

        const result = processingFn({
          argv,
          startTimestamp,
          lineValue,
        });

        if (result) {
          portfolioValue = result.newPortfolioValue;
          startTimestamp = result.newTimestamp;
        }
      })
      .on("close", async () => {
        portfolioValue.amount = await convertCurrency(portfolioValue);
        console.log("Processed %d lines", LINE_COUNTER);
        resolve(portfolioValue);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

export const calculateNoParams = ({ startTimestamp, lineValue }) => {
  if (lineValue.timeStamp >= startTimestamp) {
    return { newPortfolioValue: lineValue, newTimestamp: lineValue.timeStamp };
  }
  return false;
};

export const calculateByToken = ({ argv, startTimestamp, lineValue }) => {
  if (argv.token === lineValue.token && lineValue.timeStamp >= startTimestamp) {
    return { newPortfolioValue: lineValue, newTimestamp: lineValue.timeStamp };
  }
  return false;
};

export const calculateByDate = ({ argv, lineValue }) => {
  /** change seconds to milliseconds */
  const timestampInMill = lineValue.timeStamp * 1000;
  if (isSameDay(new Date(timestampInMill), new Date(argv.date))) {
    return { newPortfolioValue: lineValue, newTimestamp: lineValue.timeStamp };
  }
  return false;
};

export const calculateByTokenAndDate = ({ argv, lineValue }) => {
  /** change seconds to milliseconds */
  const timestampInMill = lineValue.timeStamp * 1000;
  if (
    argv.token === lineValue.token &&
    isSameDay(new Date(timestampInMill), new Date(argv.date))
  ) {
    return { newPortfolioValue: lineValue, newTimestamp: lineValue.timeStamp };
  }
  return false;
};

/**
 * @param {String} line
 * @returns {Object}
 */
export const getColumnIndex = (line) => {
  const columns = {
    TIME_STAMP: null,
    TRANSACTION_TYPE: null,
    TOKEN: null,
    AMOUNT: null,
  };
  line.split(",").forEach((column, index) => {
    const checkedCol = column.toLowerCase().trim();
    if (checkedCol === "timestamp") columns.TIME_STAMP = index;
    if (checkedCol === "transaction_type") columns.TRANSACTION_TYPE = index;
    if (checkedCol === "token") columns.TOKEN = index;
    if (checkedCol === "amount") columns.AMOUNT = index;
  });
  return columns;
};

/**
 *
 * @param {String} line
 * @param {Object} columns
 * @returns {Object}
 */
export const getLineValue = (line, columns) => {
  const { timeStamp, transactionType, token, amount } = line
    .split(",")
    .reduce((acc, curr, index) => {
      if (index === columns.TIME_STAMP) acc.timeStamp = curr;
      else if (index === columns.TRANSACTION_TYPE) acc.transactionType = curr;
      else if (index === columns.TOKEN) acc.token = curr;
      else if (index === columns.AMOUNT) acc.amount = curr;

      return acc;
    }, {});

  return { timeStamp, transactionType, token, amount };
};

export const convertCurrency = async ({ amount, token }) => {
  const conversionAPIURL = `${process.env.CONVERSION_API}?fsym=${token}&tsyms=USD`;
  const data = await axios.get(conversionAPIURL).then((res) => res.data);

  if (data.USD) return amount * data.USD;
  /** Crypto symbol not found */
  return amount * 1;
};
