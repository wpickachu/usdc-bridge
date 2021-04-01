import { ethers } from "ethers";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } from "../constants/contants";
import { getWalletAndProvider, splitCommaList, waitForTx } from "../utils/utils";
import { Command } from 'commander';
import * as path from 'path';
import { writeConfigForNewRelayer } from "../utils/relayerConfigBuilder";
require('dotenv').config({ path: path.join(__dirname, '../admin.env')});

const addRelayerCmd = new Command("addRelayer")
.description("Add a relayer")
.option('--admin', 'If the function is being called by an admin')
.action(async function (args) {
    if (args.admin) {
        // Adding Relayer on source
        let _res = getWalletAndProvider(process.env.CHAIN1_RPC, process.env.CHAIN1_PK, undefined);
        let bridgeInstance = new ethers.Contract(process.env.CHAIN1_BRIDGE, ContractABIs.Bridge.abi, _res.chainWallet);
        let tx = await bridgeInstance.adminAddRelayer(process.env.CHAIN1_NEW_RELAYER);
        await waitForTx(_res.chainProvider, tx.hash);

        // Adding relayer on destination
        _res = getWalletAndProvider(process.env.CHAIN2_RPC, process.env.CHAIN2_PK, undefined);
        bridgeInstance = new ethers.Contract(process.env.CHAIN2_BRIDGE, ContractABIs.Bridge.abi, _res.chainWallet);
        tx = await bridgeInstance.adminAddRelayer(process.env.CHAIN2_NEW_RELAYER);
        await waitForTx(_res.chainProvider, tx.hash);
    }

    writeConfigForNewRelayer(process.env.CHAIN1_NEW_RELAYER, process.env.CHAIN2_NEW_RELAYER);
});

export const admin = new Command("admin")
    .addCommand(addRelayerCmd);