import { ethers } from "ethers";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } from "../contants";
import { splitCommaList, waitForTx } from "../utils";
import { Command } from 'commander';
import * as path from 'path';

function getWalletAndProvider(rpcUrl: string, privateKey: string, chainNetworkId: number = undefined) {
    let chainProvider = chainNetworkId ? new ethers.providers.JsonRpcProvider(rpcUrl) : new ethers.providers.JsonRpcProvider(rpcUrl, {
        name: "custom",
        chainId: chainNetworkId
    });
    let chainWallet = new ethers.Wallet(privateKey, chainProvider);
    return { chainProvider, chainWallet };
}

async function registerResource(bridgeAddress: string, handlerAddress: string, targetTokenAddress: string, resourceId: string, chainProvider: ethers.providers.JsonRpcProvider, wallet: ethers.Wallet) {
    const bridgeInstance = new ethers.Contract(bridgeAddress, ContractABIs.Bridge.abi, wallet);
    const tx = await bridgeInstance.adminSetResource(handlerAddress, resourceId, targetTokenAddress, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await waitForTx(chainProvider, tx.hash);
}

async function deployBridgeContract(chainId: number, initialRelayers: string[], wallet: ethers.Wallet, relayerThreshold: number = 1, fee: number = 0, proposalExpiry: number = 100) {
    let factory = new ethers.ContractFactory(ContractABIs.Bridge.abi, ContractABIs.Bridge.bytecode, wallet);
    let contract = await factory.deploy(
        chainId,
        initialRelayers,
        relayerThreshold,
        ethers.utils.parseEther(fee.toString()),
        proposalExpiry,
        { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT}
    );
    await contract.deployed();

    return contract.address;
}

async function deployERC20Mintable(erc20Name: string, erc20Symbol: string, wallet: ethers.Wallet) {
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Mintable.abi, ContractABIs.Erc20Mintable.bytecode, wallet);
    const contract = await factory.deploy(erc20Name, erc20Symbol, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

async function deployERC20Handler(bridgeAddress: string, wallet: ethers.Wallet) {
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Handler.abi, ContractABIs.Erc20Handler.bytecode, wallet);
    const contract = await factory.deploy(bridgeAddress, [], [], [], { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}


export const deployBridge = new Command("deployBridge")
    .option("--relayersSrc <value>", "List of initial relayers (source)", splitCommaList, [])
    .option("--relayersDest <value>", "List of initial relayers (destination)", splitCommaList, [])
    .action(async args => {
        if (!args.relayersSrc.length) args.relayersSrc.push(process.env.SRC_ADDRESS);
        if (!args.relayersDest.length) args.relayersDest.push(process.env.DEST_ADDRESS);

        let sourceChainProvider, destinationChainProvider,
            sourceWallet, destinationWallet;

        console.log(`Deploying chainsafe's chainbridge... `);
        let _res = getWalletAndProvider(process.env.SRC_CHAIN_RPC, process.env.SRC_CHAIN_PRIVATE_KEY, Number(process.env.SRC_CHAIN_NETWORK_ID));
        sourceWallet = _res.chainWallet;
        sourceChainProvider = _res.chainProvider;
        _res = getWalletAndProvider(process.env.DEST_CHAIN_RPC, process.env.DEST_CHAIN_PRIVATE_KEY, Number(process.env.DEST_CHAIN_NETWORK_ID));
        destinationWallet = _res.chainWallet;
        destinationChainProvider = _res.chainProvider;

        const sourceBridgeAddress = await deployBridgeContract(SRC_CHAIN_DEFAULT_ID, args.relayersSrc, sourceWallet);
        const sourceHandlerAddress = await deployERC20Handler(sourceBridgeAddress, sourceWallet);
        await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);

        const destBridgeAddress = await deployBridgeContract(DEST_CHAIN_DEFAULT_ID, args.relayersDest, destinationWallet);
        const destHanderAddress = await deployERC20Handler(destBridgeAddress, destinationWallet);
        const wrappedERC20Address = await deployERC20Mintable(`w${process.env.TARGET_TOKEN_NAME}`, `w${process.env.TARGET_TOKEN_NAME}`, destinationWallet);
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
        if (process.env.SRC_CHAIN_RPC.startsWith('http')) srcOpts['http'] = "true";
        let destOpts = {
            bridge: destBridgeAddress,
            erc20Handler: destHanderAddress,
            genericHandler: destHanderAddress,
            gasLimit: "1000000",
            maxGasPrice: "10000000000"
        }
        if (process.env.DEST_CHAIN_RPC.startsWith('http')) destOpts['http'] = "true";

        let bridgeConfig = { chains: [ { endpoint: "<ws_url_here>", from: process.env.SRC_ADDRESS, id: SRC_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.SRC_CHAIN_NAME, opts: srcOpts }, { endpoint: "<ws_url_here>", from: process.env.DEST_ADDRESS, id: DEST_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.DEST_CHAIN_NAME, opts: destOpts }] };
        let publishPath = path.join(__dirname, '../publish/');
        if (!existsSync(publishPath)) {
            mkdirSync(publishPath);
        }
        writeFileSync(publishPath + 'config.json', JSON.stringify(bridgeConfig) , 'utf-8'); 
        writeFileSync(publishPath + 'initialRelayers.json', JSON.stringify({ destination: args.relayersDest, source: args.relayersSrc }) , 'utf-8');


        console.log(`
        🌉 ChainBridge Deployed
        ---------------------------------------------
        Source Bridge Address: ${sourceBridgeAddress}
        Source Handler Address: ${sourceHandlerAddress}
        Token: ${process.env.SRC_TOKEN}
        ---------------------------------------------
        Destination Bridge Address: ${destBridgeAddress}
        Destination Handler Address: ${destHanderAddress}
        Destination Token Address: ${wrappedERC20Address}
        ---------------------------------------------
        Bridge Owner(src): ${process.env.SRC_ADDRESS}
        Bridge Owner(dest): ${process.env.DEST_ADDRESS}
        ERC20 Owner(dest): ${process.env.DEST_ADDRESS}
        ---------------------------------------------
        Source Relayers: ${args.relayersSrc.join(',')}
        Destination Relayers: ${args.relayersDest.join(',')}
        `);
        console.log(`⚙️     config.json written to run as the first relayer!`);
});
