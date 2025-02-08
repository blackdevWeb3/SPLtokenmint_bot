require("dotenv").config();

module.exports = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
};
