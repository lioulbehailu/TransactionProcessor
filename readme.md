# Transaction Processor CMD application

## Steps to execute

1.  `npm i`
2.  create a file called `.env` and add the following environment variables


    TRANSACTION_FILE_URL, ZIP_FILE_NAME, CSV_FILE_NAME, CONVERSION_API

4.  Then execute the following commands to process the crypto transactions

# Commands

- `node index.js` , return the latest portfolio value per token in USD
- Given a token `node index.js --token=TOKEN_SYMBOL` , return the latest portfolio value for that token in USD
- Given a date `node index.js --date=VALID_DATE_STRING`, return the portfolio value per token in USD on that date
- Given a date and a token `node index.js --date=VALID_DATE_STRING --token=TOKEN_SYMBOL`, return the portfolio value of that token in USD on that date
