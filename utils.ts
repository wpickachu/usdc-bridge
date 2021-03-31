function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const waitForTx = async (provider, hash) => {
    while (!await provider.getTransactionReceipt(hash)) {
        sleep(5000)
    }
}

export const splitCommaList = (csl: string) => csl.split(",")