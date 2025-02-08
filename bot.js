const { Telegraf } = require("telegraf");
const { createSPLToken } = require("./Utils");
const config = require("./config");

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

//start command
bot.start((ctx) => {
    ctx.reply("Welcome to the Solana Token Minting Bot!\nSend /mint to create an SPL token.");
});

// Mint command
bot.command("mint", async (ctx) => {
    ctx.reply("Please enter the token name");

    bot.on("text", async (ctx) => {
        const name = ctx.message.text;
        ctx.reply("Enter the token symbol (e.g., MYT):");

        bot.on("text", async (ctx) => {
            const symbol = ctx.message.text;
            ctx.reply("Enter the total supply:");
    
            bot.on("text", async (ctx) => {
                const reply = parseInt(ctx.message.text);
                ctx.reply("Enter the token decimals (0-9):");
    
                bot.on("text", async (ctx) => {
                    const decimals = parseInt(ctx.message.text);
    
                    ctx.reply(`Minting token ${name} (${symbol})...`);
    
                    const tokenData = await createSPLToken(name, symbol, supply, decimals);
    
                    if (tokenData.error) {
                        ctx.reply(`Error: ${tokenData.error}`);
                    } else {
                        ctx.reply(`Token Minted!\nMint Address: ${tokenData.mintAddress}\nTotal Supply: ${tokenData.totalSupply}`);
                    }
                });
            });
        });
    });
});