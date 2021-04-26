const commander = require('commander');
const path = require('path');

const inquirer = require('inquirer');
const bridgeConfigs = require('../deployments/bridges.json');
const fs = require('fs');
const { getWalletAndProvider, waitForTx } = require('../utils');
const { ContractABIs, GAS_PRICE, GAS_LIMIT } = require("../constants");
const ethers = require("ethers");
const { deployERC20Mintable, registerResource } = require('./deployBridge');

const cfg = require('dotenv').config({ path: path.join(__dirname, '../env') + '/admin.env' });


async function selectBridge() {
    let ans = await inquirer.prompt([
        {
            type: 'list',
            name: 'bridge',
            message: 'Select a bridge: ',
            choices: bridgeConfigs.bridges.map((bridge, index) => {
                return `${index + 1}. ${bridge.chains[0].name} - ${bridge.chains[1].name}`;
            }),
        }
    ]);

    return Number(ans.bridge.split('.')[0]) - 1;
}

async function selectChain(bridgeIndex) {
    let ans = await inquirer.prompt([
        {
            type: 'list',
            name: 'chainIndex',
            message: 'Select chain: ',
            choices: bridgeConfigs.bridges[bridgeIndex].chains.map((chain, index) => `${index+1}. ${chain.name}`)
        }
    ]);
    return Number(ans.chainIndex.split('.')[0]) - 1;
}

const setAdmin = new commander.Command("setAdmin")
    .action(async function (args) {
        let bridgeIndex = await selectBridge();
        let bridgeConfig = bridgeConfigs.bridges[bridgeIndex];
        chainIndex = await selectChain(bridgeIndex);

        let questions = [
            {
                name: 'PK',
                message: `[${bridgeConfig.chains[chainIndex].name}] Bridge Admin PK: `
            },
            {
                name: 'NID',
                message: `[${bridgeConfig.chains[chainIndex].name}] Network ID: `,
                type: 'number'
            },
            {
                name: 'NADMIN',
                message: `[${bridgeConfig.chains[chainIndex].name}] New Admin Address: `
            }
        ]
        if (!bridgeConfig.chains[chainIndex].endpoint.length) {
            questions.push({name: 'RPCURL',
                message: `[${bridgeConfig.chains[0].name}] Enter RPC Url: `});
        }

        ans = await inquirer.prompt(questions);
        let { PK, NID, NADMIN, RPCURL } = ans;

        _res = getWalletAndProvider(RPCURL, PK, NID);
        _wallet = _res.chainWallet;
        _chainProvider = _res.chainProvider;

        const bridgeInstanceDest = new ethers.Contract(bridgeAddress, ContractABIs.Bridge.abi, _wallet);
        let tx = await bridgeInstanceDest.renounceAdmin(NADMIN);
        await waitForTx(tx, tx.hash);
    });

/**
 * Only adds to a deployed bridge
 */
const addRelayer = new commander.Command("addRelayer")
    .description("Adds a relayer to existing bridge")
    .action(async function (args) {
        let bridgeIndex = await selectBridge();

        // console.log(`Select bridge: `);
        // let options = bridgeConfigs.bridges.map((bridge, index) => {
        //     return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        // });

        // cliSelect({ values: options })
        //     .then(async response => {
        //         let srcBridgeAddress = bridgeConfigs.bridges[response.id].chains[0].opts.bridge;
        //         let destBridgeAddress = bridgeConfigs.bridges[response.id].chains[1].opts.bridge;

        //         let _res = getWalletAndProvider(cfg.parsed.SRC_CHAIN_RPC_HTTPS, cfg.parsed.SRC_CHAIN_PRIVATE_KEY, Number(cfg.parsed.SRC_CHAIN_NETWORK_ID));
        //         sourceWallet = _res.chainWallet;
        //         sourceChainProvider = _res.chainProvider;
        //         _res = getWalletAndProvider(cfg.parsed.DEST_CHAIN_RPC_HTTPS, cfg.parsed.DEST_CHAIN_PRIVATE_KEY, Number(cfg.parsed.DEST_CHAIN_NETWORK_ID));
        //         destinationWallet = _res.chainWallet;
        //         destinationChainProvider = _res.chainProvider;

        //         const bridgeInstanceSrc = new ethers.Contract(srcBridgeAddress, ContractABIs.Bridge.abi, sourceWallet);
        //         const bridgeInstanceDest = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);

        //         let tx = await bridgeInstanceSrc.adminAddRelayer(cfg.parsed.SRC_NEW_RELAYER_ADDR, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
        //         await waitForTx(sourceChainProvider, tx.hash);

        //         tx = await bridgeInstanceDest.adminAddRelayer(cfg.parsed.DEST_NEW_RELAYER_ADDR, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
        //         await waitForTx(destinationChainProvider, tx.hash);

        //         console.log(`
        //         Relayers added to Bridge:
        //         ${bridgeConfigs.bridges[response.id].chains[0].name} <-> ${bridgeConfigs.bridges[response.id].chains[1].name}
        //         ${bridgeConfigs.bridges[response.id].chains[0].name}: ${cfg.parsed.SRC_CHAIN_PRIVATE_KEY}
        //         ${bridgeConfigs.bridges[response.id].chains[1].name}: ${cfg.parsed.DEST_CHAIN_PRIVATE_KEY}
        //     `);
        //     })
        //     .catch(err => {
        //         process.exit();
        //     });
    });


const registerNewToken = new commander.Command("addToken")
    .description("Registers a new token on an existing bridge.")
    .action(async function (args) {

        // console.log(`Select bridge: `);
        // let options = bridgeConfigs.bridges.map((bridge, index) => {
        //     return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        // });

        // cliSelect({ values: options })
        //     .then(async response => {
        //         let resourceIdExists = bridgeConfigs.bridges[response.id].resources.filter(_registeredResources => {
        //             _registeredResources.resourceId === cfg.parsed.RESOURCE_ID
        //         }).length;


        //         if (resourceIdExists) {
        //             // Error, registering same resourceId
        //             process.exit();
        //         } else {
        //             let srcBridgeAddress = bridgeConfigs.bridges[response.id].chains[0].opts.bridge;
        //             let destBridgeAddress = bridgeConfigs.bridges[response.id].chains[1].opts.bridge;

        //             let _res = getWalletAndProvider(cfg.parsed.SRC_CHAIN_RPC_HTTPS, cfg.parsed.SRC_CHAIN_PRIVATE_KEY, 0);
        //             sourceWallet = _res.chainWallet;
        //             sourceChainProvider = _res.chainProvider;

        //             _res = getWalletAndProvider(cfg.parsed.DEST_CHAIN_RPC_HTTPS, cfg.parsed.DEST_CHAIN_PRIVATE_KEY, 1);
        //             destinationWallet = _res.chainWallet;
        //             destinationChainProvider = _res.chainProvider;

        //             const sourceHandlerAddress = bridgeConfigs.bridges[response.id].chains[0].opts.erc20Handler;
        //             const destHanderAddress = bridgeConfigs.bridges[response.id].chains[1].opts.erc20Handler;

        //             const chainIdSrc = bridgeConfigs.bridges[response.id].chains[0].id;
        //             const chainIdDest = bridgeConfigs.bridges[response.id].chains[1].id;

        //             prompt.start();
        //             let schema = {
        //                 properties: {
        //                     decimals: {
        //                         type: 'number',
        //                         maessage: "Should only be numberic within the range (1-18)",
        //                         description: "Decimal places for source token (1-18)",
        //                         required: true
        //                     }
        //                 }
        //             }

        //             prompt.get(schema, async function (err, result) {
        //                 await registerResource(srcBridgeAddress, sourceHandlerAddress, cfg.parsed.SRC_TOKEN, cfg.parsed.RESOURCE_ID, sourceChainProvider, sourceWallet);

        //                 const wrappedERC20Address = await deployERC20Mintable(`Wrapped ${cfg.parsed.TARGET_TOKEN_NAME}`, `w${cfg.parsed.TARGET_TOKEN_SYMBOL}`, destinationWallet, result.decimals);
        //                 await registerResource(destBridgeAddress, destHanderAddress, wrappedERC20Address, cfg.parsed.RESOURCE_ID, destinationChainProvider, destinationWallet);

        //                 const bridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);
        //                 let tx = await bridgeInstance.adminSetBurnable(destHanderAddress, wrappedERC20Address, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
        //                 await waitForTx(destinationChainProvider, tx.hash);

        //                 const erc20Instance = new ethers.Contract(wrappedERC20Address, ContractABIs.Erc20Mintable.abi, destinationWallet);
        //                 let MINTER_ROLE = await erc20Instance.MINTER_ROLE();

        //                 tx = await erc20Instance.grantRole(MINTER_ROLE, destHanderAddress);
        //                 await waitForTx(destinationChainProvider, tx.hash);

        //                 let newResources = {
        //                     tokens: {
        //                         [chainIdSrc]: cfg.parsed.SRC_TOKEN,
        //                         [chainIdDest]: wrappedERC20Address
        //                     },
        //                     resourceId: cfg.parsed.RESOURCE_ID
        //                 };

        //                 bridgeConfigs.bridges[response.id].resources.push(newResources);

        //                 fs.writeFileSync(path.join(__dirname, '../deployments/bridges.json'), JSON.stringify(bridgeConfigs));
        //                 console.log(`Updated deployments cofig file with new resources!`);
        //             });
        //         }
        //     })
        //     .catch(err => {
        //         process.exit();
        //     });
    });


exports.admin = new commander.Command('admin')
    .addCommand(addRelayer)
    .addCommand(registerNewToken)
    .addCommand(setAdmin)