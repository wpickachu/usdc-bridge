import { writeFileSync, existsSync, mkdirSync } from "fs";
import { Command } from 'commander';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../deploy.env')});
import * as relayerConfig from '../constants/deployedbridge.json';

export function writeConfigForNewRelayer(sourceRAddress: string, destinationRAddress: string) {
    relayerConfig.chains[0].from = sourceRAddress;
    relayerConfig.chains[1].from = destinationRAddress;

    let publishPath = path.join(__dirname, '../publish/');
    if (!existsSync(publishPath)) mkdirSync(publishPath);

    writeFileSync(publishPath + `config-${Date.now()}.json`, JSON.stringify(relayerConfig) , 'utf-8'); 
    writeFileSync(publishPath + `addresses-${Date.now()}.txt`, `
    🌉 ChainBridge Relayer Config Created
    ---------------------------------------------
    Bridge Address: ${sourceRAddress}
    Handler Address: ${destinationRAddress}
    ---------------------------------------------`, 'utf-8');

    console.log(`⚙️     Relayer config.json created!`);
}
