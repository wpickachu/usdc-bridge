const commander = require('commander');
const path = require('path');
const fs = require('fs');
const cliSelect = require('cli-select');
const bridgeConfigs = require('../deployments/bridges.json');

const cfg = require('dotenv').config({ path: path.join(__dirname,'../env') + '/relayer.env' });

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
            configToWrite.chains[0].from = cfg.parsed.SRC_ADDR;
            configToWrite.chains[1].from = cfg.parsed.DEST_ADDR;
            fs.writeFileSync(path.join(__dirname, '../relayer/') + `config.json`, JSON.stringify(configToWrite), 'utf-8');
        })
        .catch(err => {
            process.exit();
        })
});