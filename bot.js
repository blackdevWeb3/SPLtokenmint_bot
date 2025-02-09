const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} = require("@solana/web3.js");
const { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  getAccount, 
  getMint, 
  TOKEN_PROGRAM_ID 
} = require("@solana/spl-token");
const { TELEGRAM_BOT_TOKEN, SOLANA_RPC_URL, WALLET_DIR } = require("./config");

// Connect to Solana
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Ensure wallet directory exists
if (!fs.existsSync(WALLET_DIR)) fs.mkdirSync(WALLET_DIR);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 Welcome to the SPL Token Minting Bot!\n\n"
    + "Use `/createwallet` to generate a new Solana wallet.\n"
    + "Use `/mint` to mint SPL tokens into your wallet.\n"
    + "Use `/balance` to check your token & SOL balance."
  );
});

// 📌 Command: Create a New Wallet
bot.onText(/\/createwallet/, async (msg) => {
  const chatId = msg.chat.id;
  const walletPath = `${WALLET_DIR}user-${chatId}.json`;

  if (fs.existsSync(walletPath)) {
    return bot.sendMessage(chatId, "⚠️ You already have a wallet! Use `/mint` to create tokens.");
  }

  // Generate a new Solana wallet
  const newKeypair = Keypair.generate();
  const publicKey = newKeypair.publicKey.toBase58();
  const secretKey = Array.from(newKeypair.secretKey);

  // Save wallet (store securely in production)
  fs.writeFileSync(walletPath, JSON.stringify(secretKey));

  bot.sendMessage(
    chatId,
    `✅ New wallet created!\n🔑 *Public Key*: \`${publicKey}\`\n🔒 *Private Key*: (Only share this if you trust someone!)\n\`${JSON.stringify(secretKey)}\`\n\n💰 Funding your wallet with 0.1 SOL for transaction fees...`,
    { parse_mode: "Markdown" }
  );

  // ✅ Airdrop 0.1 SOL to the new wallet (Only works on Devnet)
  try {
    const airdropSignature = await connection.requestAirdrop(
      new PublicKey(publicKey),
      0.1 * LAMPORTS_PER_SOL // 0.1 SOL
    );
    await connection.confirmTransaction(airdropSignature);

    bot.sendMessage(chatId, "✅ 0.1 SOL Airdropped Successfully! You can now mint tokens.");
  } catch (error) {
    bot.sendMessage(chatId, "⚠️ Failed to airdrop SOL. Please send some SOL manually.");
  }
});

// 📌 Command: Mint SPL Token to the New Wallet
bot.onText(/\/mint/, async (msg) => {
  const chatId = msg.chat.id;
  const walletPath = `${WALLET_DIR}user-${chatId}.json`;

  if (!fs.existsSync(walletPath)) {
    return bot.sendMessage(chatId, "⚠️ You need to create a wallet first using `/createwallet`.");
  }

  bot.sendMessage(chatId, "✍️ Enter token details in this format:\n\n"
    + "`TokenName TokenSymbol Supply Decimals`\n\n"
    + "Example:\n"
    + "`MyToken MYT 1000000 6`", { parse_mode: "Markdown" });

  bot.once("message", async (msg) => {
    const input = msg.text.split(" ");
    if (input.length !== 4) return bot.sendMessage(chatId, "⚠️ Invalid format. Try `/mint` again.");

    const [tokenName, tokenSymbol, supply, decimals] = input;
    if (isNaN(supply) || isNaN(decimals)) {
      return bot.sendMessage(chatId, "⚠️ Supply and Decimals must be numbers. Try `/mint` again.");
    }

    // Load user’s wallet
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
    const userWallet = Keypair.fromSecretKey(secretKey);

    bot.sendMessage(chatId, `⏳ Minting *${tokenName} (${tokenSymbol})* to your wallet...\n`
      + `Supply: ${supply}\nDecimals: ${decimals}`,
      { parse_mode: "Markdown" });

    try {
      // ✅ Create SPL Token
      const mint = await createMint(
        connection,
        userWallet,
        userWallet.publicKey,
        null,
        parseInt(decimals),
      );

      // ✅ Get or Create an Associated Token Account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userWallet,
        mint,
        userWallet.publicKey
      );

      // ✅ Mint Tokens Directly to User's Wallet
      await mintTo(
        connection,
        userWallet,
        mint,
        userTokenAccount.address,
        userWallet,
        supply * (10 ** decimals)
      );

      bot.sendMessage(
        chatId,
        `✅ Successfully minted *${supply}* ${tokenSymbol}!\n\n`
        + `🔗 Token Address: \`${mint.toBase58()}\`\n`
        + `🔗 [View on Solana Explorer](https://solscan.io/token/${mint.toBase58()})\n`
        + `📥 Check your Phantom or Solflare wallet for the tokens.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      bot.sendMessage(chatId, `❌ Error minting token: ${error.message}`);
    }
  });
});

// 📌 Command: Check Wallet Balance
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const walletPath = `${WALLET_DIR}user-${chatId}.json`;

  if (!fs.existsSync(walletPath)) {
    return bot.sendMessage(chatId, "⚠️ You need to create a wallet first using `/createwallet`.");
  }

  // Load user’s wallet
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")));
  const userWallet = Keypair.fromSecretKey(secretKey);

  try {
    // Get SOL balance
    const solBalance = await connection.getBalance(userWallet.publicKey) / LAMPORTS_PER_SOL;

    // Get token balance (assumes only one minted token per user)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(userWallet.publicKey, { programId: TOKEN_PROGRAM_ID });

    let tokenMessage = "";
    tokenAccounts.value.forEach((account) => {
      const mintAddress = account.account.data.parsed.info.mint;
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const symbol = account.account.data.parsed.info.token;
      tokenMessage += `🔸${symbol} Token: ${mintAddress}\n💰 Balance: ${amount}\n\n`;
    });

    bot.sendMessage(chatId, `💰 **Wallet Balance:**\n\n🔹 **SOL Balance:** ${solBalance} SOL\n\n${tokenMessage}`, { parse_mode: "Markdown" });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error fetching balance: ${error.message}`);
  }
});

// Start bot
console.log("🤖 Telegram Bot is running...");
