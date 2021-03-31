import { ethers } from 'ethers';
import { Command } from 'commander';
import { ContractABIs, DEST_CHAIN_DEFAULT_ID, GAS_LIMIT, GAS_PRICE, SRC_CHAIN_DEFAULT_ID } from './contants';
import { waitForTx } from './utils';
import { getWalletAndProvider, deployBridgeContract, deployERC20Handler, registerResource, deployERC20Mintable } from './deploy';
import { writeFileSync } from 'fs';
require('dotenv').config();

let program = new Command();

const deployBridge = new Command("deployBridge")
    .action(async args => {
        let sourceChainProvider, destinationChainProvider,
            sourceWallet, destinationWallet;

        console.log(`Deploying chainsafe's chainbridge... `);
        let _res = getWalletAndProvider(process.env.SRC_CHAIN_RPC, process.env.SRC_CHAIN_PRIVATE_KEY, Number(process.env.SRC_CHAIN_NETWORK_ID));
        sourceWallet = _res.chainWallet;
        sourceChainProvider = _res.chainProvider;
        _res = getWalletAndProvider(process.env.DEST_CHAIN_RPC, process.env.DEST_CHAIN_PRIVATE_KEY, Number(process.env.DEST_CHAIN_NETWORK_ID));
        destinationWallet = _res.chainWallet;
        destinationChainProvider = _res.chainProvider;

        const sourceBridgeAddress = await deployBridgeContract(SRC_CHAIN_DEFAULT_ID, [process.env.SRC_CHAIN_ADDRESS], sourceWallet);
        const sourceHandlerAddress = await deployERC20Handler(sourceBridgeAddress, sourceWallet);
        await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);
        // Deployed contracts on source chain

        const destBridgeAddress = await deployBridgeContract(DEST_CHAIN_DEFAULT_ID, [process.env.DEST_CHAIN_ADDRESS], destinationWallet);
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
            Bridge Owner(src): ${process.env.SRC_CHAIN_ADDRESS}
            Bridge Owner(dest): ${process.env.DEST_CHAIN_ADDRESS}
            ERC20 Owner(dest): ${process.env.DEST_CHAIN_ADDRESS}

        `);

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
        let bridgeConfig = { chains: [ { endpoint: "<ws_url_here>", from: process.env.SRC_CHAIN_ADDRESS, id: SRC_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.SRC_CHAIN_NAME, opts: srcOpts }, { endpoint: "<ws_url_here>", from: process.env.DEST_CHAIN_ADDRESS, id: DEST_CHAIN_DEFAULT_ID.toString(), type: 'ethereum', name: process.env.DEST_CHAIN_NAME, opts: destOpts }] };
        writeFileSync('config.json', JSON.stringify(bridgeConfig) , 'utf-8'); 
});

program.addCommand(deployBridge);
program.allowUnknownOption(false);

const run = async () => {
    try {
        await program.parseAsync(process.argv);
    } catch (e) {
        console.log({ e });
        process.exit(1)
    }
}


if (process.argv && process.argv.length <= 2) {
    program.help();
} else {
    run()
}