const commander = require('commander');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const bridgeConfigs = require('../deployments/bridges.json');

const cfg = require('dotenv').config({ path: path.join(__dirname, '../env') + '/relayer.env' });

exports.startRelayerCmd = new commander.Command("setupRelayer")
    .description("Start a relayer")
    .action(async function (args) {

        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'bridge',
                    message: 'Select a bridge: ',
                    choices: bridgeConfigs.bridges.map((bridge, index) => {
                        return `${index + 1}. ${bridge.chains[0].name} - ${bridge.chains[1].name}`;
                    }),
                },
            ])
            .then(async (answers) => {
                let chainIndex = Number(answers.bridge.split(".")[0]) - 1;
                let configToWrite = bridgeConfigs.bridges[chainIndex];

                configToWrite.chains[0].from = cfg.parsed.CH1_ADDR;
                configToWrite.chains[1].from = cfg.parsed.CH2_ADDR;

                if (!configToWrite.chains[0].endpoint.length) {
                    let ans = await inquirer.prompt([
                        {
                            name: 'endpoint',
                            message: `[${configToWrite.chains[0].name}] RPC Url: `
                        }
                    ])

                    configToWrite.chains[0].endpoint = ans.endpoint;
                    if (ans.endpoint.startsWith('http')) configToWrite.chains[0].opts['http'] = 'true';
                }

                if (!configToWrite.chains[1].endpoint.length) {
                    let ans = await inquirer.prompt([
                        {
                            name: 'endpoint',
                            message: `[${configToWrite.chains[1].name}] RPC Url: `
                        }
                    ])

                    configToWrite.chains[1].endpoint = ans.endpoint;
                    if (ans.endpoint.startsWith('http')) configToWrite.chains[1].opts['http'] = 'true';
                }

                fs.writeFileSync(path.join(__dirname, '../relayer/') + `config.json`, JSON.stringify(configToWrite), 'utf-8');
            });
    });