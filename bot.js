const { Telegraf } = require("telegraf");
const { createSPLToken } = require("./Utils");
const config = require("./config");

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

let userSession = {}; // Store user input temporarily

// Start command
bot.start((ctx) => {
    ctx.reply("Welcome to the Solana Token Minting Bot!\nSend /mint to create an SPL token.");
});

// Mint command - Step 1 (Token Name)
bot.command("mint", (ctx) => {
    ctx.reply("Enter the token name:");
    userSession[ctx.chat.id] = { step: 1 };
});

// Handle user responses
bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userInput = ctx.message.text;

    if (!userSession[chatId]) return;

    switch (userSession[chatId].step) {
        case 1:
            userSession[chatId].name = userInput;
            ctx.reply("Enter the token symbol (e.g., MYT):");
            userSession[chatId].step = 2;
            break;

        case 2:
            userSession[chatId].symbol = userInput;
            ctx.reply("Enter the total supply:");
            userSession[chatId].step = 3;
            break;

        case 3:
            if (isNaN(userInput)) {
                ctx.reply("❌ Please enter a valid number for supply.");
                return;
            }
            userSession[chatId].supply = parseInt(userInput);
            ctx.reply("Enter the token decimals (0-9):");
            userSession[chatId].step = 4;
            break;

        case 4:
            if (isNaN(userInput) || parseInt(userInput) < 0 || parseInt(userInput) > 9) {
                ctx.reply("❌ Please enter a valid number (0-9) for decimals.");
                return;
            }
            userSession[chatId].decimals = parseInt(userInput);

            ctx.reply(`Minting token: ${userSession[chatId].name} (${userSession[chatId].symbol})...`);
            const tokenData = await createSPLToken(
                userSession[chatId].name,
                userSession[chatId].symbol,
                userSession[chatId].supply,
                userSession[chatId].decimals
            );

            if (tokenData.error) {
                ctx.reply(`❌ Error: ${tokenData.error}`);
            } else {
                ctx.reply(`✅ Token Minted!\nMint Address: ${tokenData.mintAddress}\nTotal Supply: ${tokenData.totalSupply}`);
            }
            
            delete userSession[chatId]; // Clear session
            break;
    }
});

// Start bot
bot.launch();
console.log("Bot is running...");
