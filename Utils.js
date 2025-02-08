const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const config = require("./config");

// Connect to Solana network
const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");

// Load private key (Ensure it's a valid JSON array)
let secretKey;
try {
    secretKey = JSON.parse(config.PRIVATE_KEY);
    
    if (!Array.isArray(secretKey) || secretKey.length !== 64) {
        throw new Error("Invalid private key format. Must be a JSON array of 64 numbers.");
    }

    secretKey = Uint8Array.from(secretKey);
} catch (error) {
    console.error("❌ Error loading private key:", error.message);
    process.exit(1);
}

// Create Keypair from private key
const adminWallet = Keypair.fromSecretKey(secretKey);

async function createSPLToken(name, symbol, supply, decimals) {
    try {
        console.log(`Minting ${name} (${symbol}) with supply ${supply}...`);

        // Create a new mint
        const mint = await createMint(
            connection,
            adminWallet,
            adminWallet.publicKey,
            null,
            decimals
        );

        // Create associated token account for admin
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            adminWallet,
            mint,
            adminWallet.publicKey
        );

        // Mint tokens to admin account
        await mintTo(
            connection,
            adminWallet,
            mint,
            tokenAccount.address,
            adminWallet,
            supply
        );

        return {
            mintAddress: mint.toBase58(),
            totalSupply: supply,
        };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = { createSPLToken };
