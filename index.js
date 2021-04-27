const commander = require('commander');
// import { admin } from './cmd/admin';
// import { deployBridge } from './cmd/deployBridge';
const { deployBridge } = require('./cli/deployBridge');
const { startRelayerCmd } = require('./cli/relayer');
// import { relayer } from './cmd/relayer';

let program = new commander.Command();
program.addCommand(deployBridge);
program.addCommand(startRelayerCmd);
// program.addCommand(admin);

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