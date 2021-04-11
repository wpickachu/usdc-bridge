const commander = require('commander');
const path = require('path');
const cliSelect = require('cli-select');
const bridgeConfigs = require('../deployments/bridges.json');
const { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } = require("../constants");
const cfg = require('dotenv').config({ path: path.join(__dirname,'../env') + '/admin.env' });

/**
 * Only adds to a deployed bridge
 */
exports.addRelayer = new commander.Command("addRelayer")
    .description("Adds a relayer to existing bridge")
    .action(async function (args) {

        console.log(`Select bridge: `);
        let options = bridgeConfigs.bridges.map((bridge, index) => {
            return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        });

        cliSelect({ values: options })
        .then(response => {
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

            let tx = await bridgeInstanceDest.adminAddRelayer(cfg.parsed.DEST_NEW_RELAYER_ADDR, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
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
        })
});