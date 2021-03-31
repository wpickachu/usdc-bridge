import { ethers } from "ethers";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } from "../contants";
import { getWalletAndProvider, splitCommaList, waitForTx } from "../utils";
import { Command } from 'commander';
import * as path from 'path';

const addRelayerCmd = new Command("add-relayer")
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
    let tx = await bridgeInstance.adminAddRelayer(args.relayerSrc)
    await waitForTx(_res.chainProvider, tx.hash)

    // Adding relayer on destination
    _res = getWalletAndProvider(args.urlDest, args.adminDestKey, undefined);
    bridgeInstance = new ethers.Contract(args.bridgeDest, ContractABIs.Bridge.abi, _res.chainWallet);
    tx = await bridgeInstance.adminAddRelayer(args.relayerDest);
    await waitForTx(_res.chainProvider, tx.hash);
});

const removeRelayerCmd = new Command("remove-relayer")
.description("Remove a relayer")
.option('--relayer <address>', 'Address of relayer')
.option('--bridge <address>', 'Bridge contract address')
.action(async function (args) {
    // await setupParentArgs(args, args.parent.parent)
    // const bridgeInstance = new ethers.Contract(args.bridge, constants.ContractABIs.Bridge.abi, args.wallet);
    // log(args, `Removing relayer ${args.relayer}.`)
    // let tx = await bridgeInstance.adminRemoveRelayer(args.relayer)
    // await waitForTx(args.provider, tx.hash)
})

const setThresholdCmd = new Command("set-threshold")
.description("Set relayer threshold")
.option('--bridge <address>', 'Bridge contract address')
.option('--threshold <value>', 'New relayer threshold')
.action(async function (args) {
    // await setupParentArgs(args, args.parent.parent)
    // const bridgeInstance = new ethers.Contract(args.bridge, constants.ContractABIs.Bridge.abi, args.wallet);
    // log(args, `Setting relayer threshold to ${args.threshold}`)
    // let tx = await bridgeInstance.adminChangeRelayerThreshold(args.threshold)
    // await waitForTx(args.provider, tx.hash)
})
