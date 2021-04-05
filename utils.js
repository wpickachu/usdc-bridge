const ethers = require('ethers');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.waitForTx = async (provider, hash) => {
    console.log(`[${hash}] Waiting for transaction...`);
    while (!await provider.getTransactionReceipt(hash)) {
        sleep(5000)
    }
}

exports.splitCommaList = (csl) => csl.split(",")

exports.getWalletAndProvider = function(rpcUrl, privateKey, chainNetworkId = undefined) {
    let chainProvider = chainNetworkId ? new ethers.providers.JsonRpcProvider(rpcUrl) : new ethers.providers.JsonRpcProvider(rpcUrl, {
        name: "custom",
        chainId: chainNetworkId
    });
    let chainWallet = new ethers.Wallet(privateKey, chainProvider);
    return { chainProvider, chainWallet };
}

exports.expandDecimals = function (amount, decimals = 18) {
    return ethers.utils.parseUnits(String(amount), decimals);
}