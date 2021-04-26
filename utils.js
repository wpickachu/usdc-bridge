const ethers = require('ethers');
const fs = require('fs');
const solc = require('solc');

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
    let chainProvider = chainNetworkId
      ? new ethers.providers.JsonRpcProvider(rpcUrl, {
          name: "custom",
          chainId: chainNetworkId,
        })
      : new ethers.providers.JsonRpcProvider(rpcUrl);
    let chainWallet = new ethers.Wallet(privateKey, chainProvider);
    return { chainProvider, chainWallet };
}

exports.expandDecimals = function (amount, decimals = 18) {
    return ethers.utils.parseUnits(String(amount), decimals);
}


exports.compileMintableERC20 = async function(tokenName, tokenSymbol, decimalPlaces = 18) {
    const input = {
        language: 'Solidity',
        sources: {
            'ExtendedERC20PresetMinterPauser.sol': {
                content: fs.readFileSync(`./contracts/custom/ExtendedERC20PresetMinterPauser.sol`, { encoding: 'utf-8' })
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };

    var output = JSON.parse(solc.compile(JSON.stringify(input), { import: getContents }));
    return output.contracts['ExtendedERC20PresetMinterPauser.sol']['ExtendedERC20PresetMinterPauser']
}

function getContents(fileName) {
    try {
        let contents = fs.readFileSync(`./contracts/custom/${fileName}`, { encoding: 'utf-8' });
        return { contents };
    } catch (err) {
        return { error: 'File not found!' };
    }
}