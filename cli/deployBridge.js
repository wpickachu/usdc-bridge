 
const ethers = require("ethers");
const fs = require('fs');

const { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } = require("../constants");
const { getWalletAndProvider, splitCommaList, waitForTx } = require("../utils");
const commander = require('commander');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../env/deployBridge.env')});

async function registerResource(bridgeAddress, handlerAddress, targetTokenAddress, resourceId, chainProvider, wallet) {
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

const deployERC20Mintable = async function (erc20Name, erc20Symbol, wallet) {
    console.log(`Deploying ERC20 contract...`);
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Mintable.abi, ContractABIs.Erc20Mintable.bytecode, wallet);
    const contract = await factory.deploy(erc20Name, erc20Symbol, 0, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

exports.deployERC20Mintable = deployERC20Mintable;

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

            const sourceBridgeAddress = await deployBridgeContract(SRC_CHAIN_DEFAULT_ID, args.relayersSrc, sourceWallet);
            const sourceHandlerAddress = await deployERC20Handler(sourceBridgeAddress, sourceWallet);
            await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);

            const destBridgeAddress = await deployBridgeContract(DEST_CHAIN_DEFAULT_ID, args.relayersDest, destinationWallet);
            const destHanderAddress = await deployERC20Handler(destBridgeAddress, destinationWallet);
            const wrappedERC20Address = await deployERC20Mintable(`Wrapped ${process.env.TARGET_TOKEN_NAME}`, `Wrapped ${process.env.TARGET_TOKEN_NAME}`, destinationWallet);
            await registerResource(destBridgeAddress, destHanderAddress, wrappedERC20Address, process.env.RESOURCE_ID, destinationChainProvider, destinationWallet);


            const bridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);
            let tx = await bridgeInstance.adminSetBurnable(destHanderAddress, wrappedERC20Address, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
            await waitForTx(destinationChainProvider, tx.hash)


            const erc20Instance = new ethers.Contract(wrappedERC20Address, ContractABIs.Erc20Mintable.abi, destinationWallet);
            let MINTER_ROLE = await erc20Instance.MINTER_ROLE();

            tx = await erc20Instance.grantRole(MINTER_ROLE, destHanderAddress);
            await waitForTx(destinationChainProvider, tx.hash);

            let srcOpts = {
                bridge: sourceBridgeAddress,
                erc20Handler: sourceHandlerAddress,
                genericHandler: sourceHandlerAddress,
                gasLimit: "1000000",
                maxGasPrice: "10000000000"
            };
            if (!process.env.SRC_CHAIN_RPC_WS.length) { srcOpts['http'] = "true"; }
            let destOpts = {
                bridge: destBridgeAddress,
                erc20Handler: destHanderAddress,
                genericHandler: destHanderAddress,
                gasLimit: "1000000",
                maxGasPrice: "10000000000"
            }
            if (!process.env.DEST_CHAIN_RPC_WS.length) destOpts['http'] = "true";

            let resources = [];
            resources.push({ tokens: { [SRC_CHAIN_DEFAULT_ID]: process.env.SRC_TOKEN, [DEST_CHAIN_DEFAULT_ID]: wrappedERC20Address }, resourceId: process.env.RESOURCE_ID });
            let relayerConfig = { chains: [ { resources, endpoint: process.env.SRC_CHAIN_RPC_WS.length ? process.env.SRC_CHAIN_RPC_WS : process.env.SRC_CHAIN_RPC_HTTPS, from: process.env.SRC_ADDRESS, id: SRC_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.SRC_CHAIN_NAME, opts: srcOpts }, { endpoint: process.env.DEST_CHAIN_RPC_WS.length ? process.env.DEST_CHAIN_RPC_WS : process.env.DEST_CHAIN_RPC_HTTPS, from: process.env.DEST_ADDRESS, id: DEST_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.DEST_CHAIN_NAME, opts: destOpts }] };
            let publishPath = path.join(__dirname, '../publish/');
            if (!fs.existsSync(publishPath)) {
                fs.mkdirSync(publishPath);
            }
            fs.writeFileSync(publishPath + 'config.json', JSON.stringify(relayerConfig) , 'utf-8'); 
            fs.writeFileSync(publishPath + 'addresses.txt', `🌉 ChainBridge Config\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Bridge Address: ${sourceBridgeAddress}\n[${process.env.SRC_CHAIN_NAME}] Handler Address: ${sourceHandlerAddress}\n---------------------------------------------\n[${process.env.DEST_CHAIN_NAME}] Bridge Address: ${destBridgeAddress}\n[${process.env.DEST_CHAIN_NAME}] Handler Address: ${destHanderAddress}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] ERC20: ${process.env.SRC_TOKEN}\n[${process.env.DEST_CHAIN_NAME}] ERC20: ${wrappedERC20Address}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Bridge Owner: ${process.env.SRC_ADDRESS}\n[${process.env.DEST_CHAIN_NAME}] Bridge Owner: ${process.env.DEST_ADDRESS}\n---------------------------------------------\nResource ID: ${process.env.RESOURCE_ID}\n---------------------------------------------\n[${process.env.SRC_CHAIN_NAME}] Relayers: ${args.relayersSrc.join(',')}\n[${process.env.DEST_CHAIN_NAME}] Relayers: ${args.relayersDest.join(',')}`, 'utf-8');

            console.log(`
            🌉 ChainBridge Config
            ---------------------------------------------
            [${process.env.SRC_CHAIN_NAME}] Bridge Address: ${sourceBridgeAddress}
            [${process.env.SRC_CHAIN_NAME}] Handler Address: ${sourceHandlerAddress}
            ---------------------------------------------
            [${process.env.DEST_CHAIN_NAME}] Bridge Address: ${destBridgeAddress}
            [${process.env.DEST_CHAIN_NAME}] Handler Address: ${destHanderAddress}
            ---------------------------------------------
            [${process.env.SRC_CHAIN_NAME}] ERC20: ${process.env.SRC_TOKEN}
            [${process.env.DEST_CHAIN_NAME}] ERC20: ${wrappedERC20Address}
            ---------------------------------------------
            [${process.env.SRC_CHAIN_NAME}] Bridge Owner: ${process.env.SRC_ADDRESS}
            [${process.env.DEST_CHAIN_NAME}] Bridge Owner: ${process.env.DEST_ADDRESS}
            ---------------------------------------------
            Resource ID: ${process.env.RESOURCE_ID}
            ---------------------------------------------
            [${process.env.SRC_CHAIN_NAME}] Relayers: ${args.relayersSrc.join(',')}
            [${process.env.DEST_CHAIN_NAME}] Relayers: ${args.relayersDest.join(',')}
            `);
            console.log(`⚙️     config.json created to run as the first relayer!`);
        } catch (err) {
            console.log(err)
        }

});
