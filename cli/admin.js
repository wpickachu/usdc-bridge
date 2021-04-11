const commander = require('commander');
const path = require('path');
const cliSelect = require('cli-select');
const bridgeConfigs = require('../deployments/bridges.json');
const { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } = require("../constants");
const cfg = require('dotenv').config({ path: path.join(__dirname, '../env') + '/admin.env' });
const prompt = require('prompt');

/**
 * Only adds to a deployed bridge
 */
const addRelayer = new commander.Command("addRelayer")
    .description("Adds a relayer to existing bridge")
    .action(async function (args) {

        console.log(`Select bridge: `);
        let options = bridgeConfigs.bridges.map((bridge, index) => {
            return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        });

        cliSelect({ values: options })
            .then(async response => {
                let srcBridgeAddress = bridgeConfigs.bridges[response.id].chains[0].opts.bridge;
                let destBridgeAddress = bridgeConfigs.bridges[response.id].chains[1].opts.bridge;

                let _res = getWalletAndProvider(cfg.parsed.SRC_CHAIN_RPC_HTTPS, cfg.parsed.SRC_CHAIN_PRIVATE_KEY, Number(cfg.parsed.SRC_CHAIN_NETWORK_ID));
                sourceWallet = _res.chainWallet;
                sourceChainProvider = _res.chainProvider;
                _res = getWalletAndProvider(cfg.parsed.DEST_CHAIN_RPC_HTTPS, cfg.parsed.DEST_CHAIN_PRIVATE_KEY, Number(cfg.parsed.DEST_CHAIN_NETWORK_ID));
                destinationWallet = _res.chainWallet;
                destinationChainProvider = _res.chainProvider;

                const bridgeInstanceSrc = new ethers.Contract(srcBridgeAddress, ContractABIs.Bridge.abi, sourceWallet);
                const bridgeInstanceDest = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);

                let tx = await bridgeInstanceSrc.adminAddRelayer(cfg.parsed.SRC_NEW_RELAYER_ADDR, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
                await waitForTx(sourceChainProvider, tx.hash);

                tx = await bridgeInstanceDest.adminAddRelayer(cfg.parsed.DEST_NEW_RELAYER_ADDR, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
                await waitForTx(destinationChainProvider, tx.hash);

                console.log(`
                Relayers added to Bridge:
                ${bridgeConfigs.bridges[response.id].chains[0].name} <-> ${bridgeConfigs.bridges[response.id].chains[1].name}
                ${bridgeConfigs.bridges[response.id].chains[0].name}: ${cfg.parsed.SRC_CHAIN_PRIVATE_KEY}
                ${bridgeConfigs.bridges[response.id].chains[1].name}: ${cfg.parsed.DEST_CHAIN_PRIVATE_KEY}
            `);
            })
            .catch(err => {
                process.exit();
            });
    });


const registerNewToken = new commander.Command("addToken")
    .description("Adds a relayer to existing bridge")
    .action(async function (args) {

        console.log(`Select bridge: `);
        let options = bridgeConfigs.bridges.map((bridge, index) => {
            return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        });

        cliSelect({ values: options })
            .then(response => {
                // let srcBridgeAddress = bridgeConfigs.bridges[response.id].chains[0].opts.bridge;
                // let destBridgeAddress = bridgeConfigs.bridges[response.id].chains[1].opts.bridge;

                // let _res = getWalletAndProvider(cfg.parsed.SRC_CHAIN_RPC_HTTPS, cfg.parsed.SRC_CHAIN_PRIVATE_KEY, Number(cfg.parsed.SRC_CHAIN_NETWORK_ID));
                // sourceWallet = _res.chainWallet;
                // sourceChainProvider = _res.chainProvider;
                // _res = getWalletAndProvider(cfg.parsed.DEST_CHAIN_RPC_HTTPS, cfg.parsed.DEST_CHAIN_PRIVATE_KEY, Number(cfg.parsed.DEST_CHAIN_NETWORK_ID));
                // destinationWallet = _res.chainWallet;
                // destinationChainProvider = _res.chainProvider;

                // const bridgeInstanceSrc = new ethers.Contract(srcBridgeAddress, ContractABIs.Bridge.abi, sourceWallet);
                // const bridgeInstanceDest = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);

                prompt.start();

                let schema = {
                    properties: {
                        decimals: {
                            type: 'number',
                            maessage: "Should only be numberic within the range (1-18)",
                            description: "Decimal places for source token (1-18)",
                            required: true
                        },
                        useExistingHandler: {
                            pattern: /y|n/,
                            description: "Use existing handler? (y/n)",
                        }
                    }
                }

                prompt.get(schema, function (err, result) {
                    console.log(result);

                    // await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);
                    // await registerResource(destBridgeAddress, destHanderAddress, wrappedERC20Address, process.env.RESOURCE_ID, destinationChainProvider, destinationWallet);

                    // const bridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);
                    // let tx = await bridgeInstance.adminSetBurnable(destHanderAddress, wrappedERC20Address, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
                    // await waitForTx(destinationChainProvider, tx.hash)        
        
                    // const erc20Instance = new ethers.Contract(wrappedERC20Address, ContractABIs.Erc20Mintable.abi, destinationWallet);
                    // let MINTER_ROLE = await erc20Instance.MINTER_ROLE();
        
                    // tx = await erc20Instance.grantRole(MINTER_ROLE, destHanderAddress);
                    // await waitForTx(destinationChainProvider, tx.hash);
                });
            })
            .catch(err => {
                process.exit();
            });
    });


exports.admin = new commander.Command('admin')
    .addCommand(addRelayer)
    .addCommand(registerNewToken)