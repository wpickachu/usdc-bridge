 
const ethers = require("ethers");
const fs = require('fs');
const { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } = require("../constants");
const { getWalletAndProvider, splitCommaList, waitForTx, compileMintableERC20 } = require("../utils");
const commander = require('commander');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../env/deployBridge.env')});

const registerResource = async function (bridgeAddress, handlerAddress, targetTokenAddress, resourceId, chainProvider, wallet) {
    const bridgeInstance = new ethers.Contract(bridgeAddress, ContractABIs.Bridge.abi, wallet);
    const tx = await bridgeInstance.adminSetResource(handlerAddress, resourceId, targetTokenAddress, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await waitForTx(chainProvider, tx.hash);
}

async function deployBridgeContract(chainId, initialRelayers, wallet, relayerThreshold = 1, fee = 0, proposalExpiry = 100) {
    console.log(`Deploying bridge contract...`);
    let factory = new ethers.ContractFactory(ContractABIs.Bridge.abi, ContractABIs.Bridge.bytecode, wallet);
    let contract = await factory.deploy(
        chainId.toString(),
        initialRelayers,
        relayerThreshold.toString(),
        ethers.utils.parseEther(fee.toString()),
        proposalExpiry.toString(),
        { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT }
    );
    await contract.deployed();
    return contract.address;
}

const deployERC20Mintable = async function (erc20Name, erc20Symbol, wallet, decimals = 18) {
    const compiledContract = await compileMintableERC20();
    console.log(`Deploying ERC20 contract...`);
    const factory = new ethers.ContractFactory(compiledContract.abi, compiledContract.evm.bytecode.object, wallet);
    const contract = await factory.deploy(erc20Name, erc20Symbol, decimals, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

async function deployERC20Handler(bridgeAddress, wallet) {
    console.log(`Deploying ERC20 Handler...`);
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Handler.abi, ContractABIs.Erc20Handler.bytecode, wallet);
    const contract = await factory.deploy(bridgeAddress, [], [], [], { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}


exports.deployBridge = new commander.Command("deployBridge")
    .option("--relayersSrc <value>", "List of initial relayers (source)", splitCommaList, [])
    .option("--relayersDest <value>", "List of initial relayers (destination)", splitCommaList, [])
    .action(async args => {
        if (!args.relayersSrc.length) args.relayersSrc.push(process.env.SRC_ADDRESS);
        if (!args.relayersDest.length) args.relayersDest.push(process.env.DEST_ADDRESS);

        try {
            let sourceChainProvider, destinationChainProvider,
            sourceWallet, destinationWallet;

            console.log(`Deploying chainsafe's chainbridge... `);
            let _res = getWalletAndProvider(process.env.SRC_CHAIN_RPC_HTTPS, process.env.SRC_CHAIN_PRIVATE_KEY, Number(process.env.SRC_CHAIN_NETWORK_ID));
            sourceWallet = _res.chainWallet;
            sourceChainProvider = _res.chainProvider;

            _res = getWalletAndProvider(process.env.DEST_CHAIN_RPC_HTTPS, process.env.DEST_CHAIN_PRIVATE_KEY, Number(process.env.DEST_CHAIN_NETWORK_ID));
            destinationWallet = _res.chainWallet;
            destinationChainProvider = _res.chainProvider;

            const sourceBridgeAddress = await deployBridgeContract(SRC_CHAIN_DEFAULT_ID, args.relayersSrc, sourceWallet, Number(process.env.BRIDGE_TRANSFER_FEE));
            const sourceHandlerAddress = await deployERC20Handler(sourceBridgeAddress, sourceWallet);

            const destBridgeAddress = await deployBridgeContract(DEST_CHAIN_DEFAULT_ID, args.relayersDest, destinationWallet, Number(process.env.BRIDGE_TRANSFER_FEE));
            const destHanderAddress = await deployERC20Handler(destBridgeAddress, destinationWallet);

            let resources = [];
            if (process.env.SRC_TOKEN) {
                // Registration one "source" side
                await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);
                // mintable deployment on "dest" side
                const wrappedERC20Address = await deployERC20Mintable(`Wrapped ${process.env.TARGET_TOKEN_NAME}`, `Wrapped ${process.env.TARGET_TOKEN_NAME}`, destinationWallet, process.env.SRC_DECIMALS);
                await registerResource(destBridgeAddress, destHanderAddress, wrappedERC20Address, process.env.RESOURCE_ID, destinationChainProvider, destinationWallet);
                let bridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);
                let tx = await bridgeInstance.adminSetBurnable(destHanderAddress, wrappedERC20Address, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
                await waitForTx(destinationChainProvider, tx.hash);
                // change deploy mintable erc20 owner to multi and multi sig will 
                // grant minter role to handler but lets go simple for now
                const erc20Instance = new ethers.Contract(wrappedERC20Address, ContractABIs.Erc20Mintable.abi, destinationWallet);
                let MINTER_ROLE = await erc20Instance.MINTER_ROLE();
                tx = await erc20Instance.grantRole(MINTER_ROLE, destHanderAddress);
                await waitForTx(destinationChainProvider, tx.hash);

                resources.push({ tokens: { [SRC_CHAIN_DEFAULT_ID]: process.env.SRC_TOKEN, [DEST_CHAIN_DEFAULT_ID]: wrappedERC20Address }, resourceId: process.env.RESOURCE_ID });
            }

            if (process.env.SRC_MULTISIG.length && process.env.DEST_MULTISIG.length) {
                let srcbridgeInstance = new ethers.Contract(sourceBridgeAddress, ContractABIs.Bridge.abi, sourceWallet);
                let destbridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);

                let tx = await srcbridgeInstance.renounceAdmin(process.env.SRC_MULTISIG);
                await waitForTx(tx, tx.hash);

                tx = await destbridgeInstance.renounceAdmin(process.env.DEST_MULTISIG);
                await waitForTx(tx, tx.hash);
            }

            let gasLimit = "1000000", maxGasPrice = "10000000000";
            let srcOpts = {
                bridge: sourceBridgeAddress,
                erc20Handler: sourceHandlerAddress,
                genericHandler: sourceHandlerAddress,
                gasLimit,
                maxGasPrice
            };
            if (!process.env.SRC_CHAIN_RPC_WS.length) srcOpts['http'] = "true";
            let destOpts = {
                bridge: destBridgeAddress,
                erc20Handler: destHanderAddress,
                genericHandler: destHanderAddress,
                gasLimit,
                maxGasPrice
            }
            if (!process.env.DEST_CHAIN_RPC_WS.length) destOpts['http'] = "true";

            let relayerConfig = { chains: [ { resources, endpoint: process.env.SRC_CHAIN_RPC_WS.length ? process.env.SRC_CHAIN_RPC_WS : process.env.SRC_CHAIN_RPC_HTTPS, from: process.env.SRC_ADDRESS, id: SRC_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.SRC_CHAIN_NAME, opts: srcOpts }, { endpoint: process.env.DEST_CHAIN_RPC_WS.length ? process.env.DEST_CHAIN_RPC_WS : process.env.DEST_CHAIN_RPC_HTTPS, from: process.env.DEST_ADDRESS, id: DEST_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.DEST_CHAIN_NAME, opts: destOpts }] };
            let publishPath = path.join(__dirname, '../publish/');

            if (!fs.existsSync(publishPath)) fs.mkdirSync(publishPath);
            let n = Date.now();
            fs.writeFileSync(publishPath + `config-${n}.json`, JSON.stringify(relayerConfig) , 'utf-8'); 
            fs.writeFileSync(publishPath + `addresses-${n}.txt`, `🌉 ChainBridge Config\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Bridge Address: ${sourceBridgeAddress}\n[${process.env.SRC_CHAIN_NAME}] Handler Address: ${sourceHandlerAddress}\n---------------------------------------------\n[${process.env.DEST_CHAIN_NAME}] Bridge Address: ${destBridgeAddress}\n[${process.env.DEST_CHAIN_NAME}] Handler Address: ${destHanderAddress}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] ERC20: ${process.env.SRC_TOKEN}\n[${process.env.DEST_CHAIN_NAME}] ERC20: ${wrappedERC20Address}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Bridge Owner: ${process.env.SRC_ADDRESS}\n[${process.env.DEST_CHAIN_NAME}] Bridge Owner: ${process.env.DEST_ADDRESS}\n---------------------------------------------\nResource ID: ${process.env.RESOURCE_ID}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Relayers: ${args.relayersSrc.join(',')}\n[${process.env.DEST_CHAIN_NAME}] Relayers: ${args.relayersDest.join(',')}`, 'utf-8');
            console.log(`⚙️     config-${n}.json created to run as the first relayer!`);

        } catch (err) {
            console.log(err)
        }

});

exports.deployERC20Mintable = deployERC20Mintable;
exports.registerResource = registerResource;