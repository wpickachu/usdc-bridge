import { ethers } from "ethers";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const waitForTx = async (provider, hash) => {
    console.log(`[${hash}] Waiting for transaction...`);
    while (!await provider.getTransactionReceipt(hash)) {
        sleep(5000)
    }
}

export const splitCommaList = (csl: string) => csl.split(",")


export function getWalletAndProvider(rpcUrl: string, privateKey: string, chainNetworkId: number = undefined) {
    let chainProvider = chainNetworkId ? new ethers.providers.JsonRpcProvider(rpcUrl) : new ethers.providers.JsonRpcProvider(rpcUrl, {
        name: "custom",
        chainId: chainNetworkId
    });
    let chainWallet = new ethers.Wallet(privateKey, chainProvider);
    return { chainProvider, chainWallet };
}

export const expandDecimals = (amount, decimals = 18) => {
    return ethers.utils.parseUnits(String(amount), decimals);
}