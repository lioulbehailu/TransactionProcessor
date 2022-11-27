import readLine from "readline";
import {
  downloadFile,
  unzipFile,
  calculateByTokenAndDate,
  processCSV,
  calculateByToken,
  calculateByDate,
  calculateNoParams,
} from "./utils.js";
import { readdirSync, createReadStream } from "fs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import dotenv from "dotenv";

dotenv.config();
const { TRANSACTION_FILE_URL, ZIP_FILE_NAME, CSV_FILE_NAME } = process.env;
const { argv } = yargs(hideBin(process.argv));

const files = readdirSync("./");
const isFileExist = files.includes(CSV_FILE_NAME);

if (!isFileExist) {
  console.log("Downloading file...");
  await downloadFile(TRANSACTION_FILE_URL, ZIP_FILE_NAME).catch(() =>
    console.log("Error when downloading file.")
  );
  console.log("Unzipping file...");
  unzipFile(ZIP_FILE_NAME, CSV_FILE_NAME, "./");
}

let portfolioValue = {};

const readByLine = readLine.createInterface({
  input: createReadStream(CSV_FILE_NAME),
});

if (!argv.token && !argv.date) {
  /** When no parameters is passed */
  portfolioValue = await processCSV({
    readByLine,
    argv,
    processingFn: calculateNoParams,
  });
} else if (argv.token && !argv.date) {
  /** When token is passed */
  portfolioValue = await processCSV({
    readByLine,
    argv,
    processingFn: calculateByToken,
  });
} else if (!argv.token && argv.date) {
  /** When no date is passed */
  const checkDate = Date.parse(new Date(argv.date));
  if (isNaN(checkDate)) {
    throw new Error("Invalid date format");
  }
  portfolioValue = await processCSV({
    readByLine,
    argv,
    processingFn: calculateByDate,
  });

  if (Object.keys(portfolioValue).length === 0) {
    portfolioValue = "No transaction found by this date";
  }
} else if (argv.token && argv.date) {
  /** When date and token is passed */
  const checkDate = Date.parse(new Date(argv.date));
  if (isNaN(checkDate)) {
    throw new Error("Invalid date format");
  }
  portfolioValue = await processCSV({
    readByLine,
    argv,
    processingFn: calculateByTokenAndDate,
  });
  if (Object.keys(portfolioValue).length === 0) {
    portfolioValue = "No transaction found by this date";
  }
}

console.log(portfolioValue);
