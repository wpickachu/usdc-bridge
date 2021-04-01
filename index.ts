import { Command } from 'commander';
import { admin } from './cmd/admin';
import { deployBridge } from './cmd/deployBridge';
require('dotenv').config();

let program = new Command();
program.addCommand(deployBridge);
program.addCommand(admin);

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