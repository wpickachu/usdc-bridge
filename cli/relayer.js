const commander = require('commander');
const path = require('path');
const fs = require('fs');
const cliSelect = require('cli-select');
const bridgeConfigs = require('../deployments/bridgeConfigs.json');

const cfg = require('dotenv').config({ path: path.join(__dirname,'../env') + '/relayer.env' });
console.log(cfg.parsed)
exports.startRelayerCmd = new commander.Command("startRelayer")
    .description("Start a relayer")
    .action(async function (args) {


        console.log(`Select bridge: `);
        let options = bridgeConfigs.bridges.map((bridge, index) => {
            return `${bridge.chains[0].name} - ${bridge.chains[1].name}`;
        });

        cliSelect({values: options})
        .then(response => {

            let configToWrite = bridgeConfigs.bridges[response.id];
            configToWrite.chains[0].from = cfg.parsed.RSRC_ADDRESS;
            configToWrite.chains[1].from = cfg.parsed.RDEST_ADDRESS;
            fs.writeFileSync(path.join(__dirname, '../relayer/') + `config.json`, JSON.stringify(configToWrite), 'utf-8');
        })
        .catch(err => {
            process.exit();
        })
});