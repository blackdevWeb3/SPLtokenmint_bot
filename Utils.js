const{ Connection, Keypair, PublicKey, Transaction} = require("@solana/web3/js");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo} = require("@solana/spl-token");
const config = require ("./config");

// Connect to Solana network
const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");

//Load private key
const secretKey = Uint8Array.from(JSON.parse(config.PRIVATE_KEY));
const ownerWallet = Keypair.fromSecretKey(secretKey);

async function createSPLToken(name, symbol, supply, decimals) {
    try {
        console.log(`Minting ${name} (${symbol}) with supply ${supply}...`);

        //Create new mint account
        const mint = await createMint(connection, ownerWallet, ownerWallet.PublicKey, null, decimals);

        //Create associated token account for main
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            ownerWallet,
            mint,
            ownerWallet.PublicKey
        );

        //Mint token to admin account
        await mintTo(connection, ownerWallet, mint, tokenAccount.address, ownerWallet, supply);

        return {
            mintAddress : mint.toBase58(),
            totalSupply : supply
        };
    } catch (error) {
        return {error : error.message};
    }
}

module.exports = {createSPLToken};