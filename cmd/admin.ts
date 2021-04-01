import { ethers } from "ethers";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } from "../constants/contants";
import { getWalletAndProvider, splitCommaList, waitForTx } from "../utils/utils";
import { Command } from 'commander';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../admin.env')});


const addRelayerCmd = new Command("addRelayer")
.description("Add a relayer")
.option('--urlSrc <rpc_url>', 'RPC url of the chain.')
.option('--adminSrcKey <private_key>', 'Private key of the bridge admin.')
.option('--relayerSrc <address>', 'Address of relayer to be added.')
.option('--bridgeSrc <address>', 'Bridge contract address')
.option('--urlDest <rpc_url>', 'RPC url of the chain.')
.option('--adminDestKey <private_key>', 'Private key of the bridge admin.')
.option('--relayerDest <address>', 'Address of relayer to be added.')
.option('--bridgeDest <address>', 'Bridge contract address')
.action(async function (args) {
    // Adding Relayer on source
    let _res = getWalletAndProvider(args.urlSrc, args.adminSrcKey, undefined);
    let bridgeInstance = new ethers.Contract(args.bridgeSrc, ContractABIs.Bridge.abi, _res.chainWallet);
    let tx = await bridgeInstance.adminAddRelayer(args.relayerSrc);
    await waitForTx(_res.chainProvider, tx.hash);

    // Adding relayer on destination
    _res = getWalletAndProvider(args.urlDest, args.adminDestKey, undefined);
    bridgeInstance = new ethers.Contract(args.bridgeDest, ContractABIs.Bridge.abi, _res.chainWallet);
    tx = await bridgeInstance.adminAddRelayer(args.relayerDest);
    await waitForTx(_res.chainProvider, tx.hash);
});

export const admin = new Command("admin")
    .addCommand(addRelayerCmd);