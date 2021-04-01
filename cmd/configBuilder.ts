import { writeFileSync, existsSync, mkdirSync } from "fs";
import { Command } from 'commander';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../deploy.env')});
import * as relayerConfig from '../constants/deployedbridge.json';

const newRelayer = new Command("newRelayer")
    .option("--sourceAddress <address>")
    .option("--destinationAddress <address>")
    .action(async args => {
        relayerConfig.chains[0].from = args.sourceAddress;
        relayerConfig.chains[1].from = args.destinationAddress;

        let publishPath = path.join(__dirname, '../publish/');
        if (!existsSync(publishPath)) {
            mkdirSync(publishPath);
        }
        writeFileSync(publishPath + 'config.json', JSON.stringify(relayerConfig) , 'utf-8'); 
        writeFileSync(publishPath + 'addresses.txt', `
        🌉 ChainBridge Relayer Config Created
        ---------------------------------------------
        Bridge Address: ${args.sourceChainAddress}
        Handler Address: ${args.desinationChainAddress}
        ---------------------------------------------`, 'utf-8');

        console.log(`⚙️     Relayer config.json created!`);
});

export const configBuilder = new Command("configBuilder")
    .addCommand(newRelayer);