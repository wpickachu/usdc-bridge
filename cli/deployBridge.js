 
const ethers = require("ethers");
const fs = require('fs');
const { ContractABIs, GAS_PRICE, GAS_LIMIT, DEST_CHAIN_DEFAULT_ID, SRC_CHAIN_DEFAULT_ID } = require("../constants");
const { getWalletAndProvider, waitForTx, compileMintableERC20 } = require("../utils");
const commander = require('commander');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../env/deployBridge.env')});

const deployBridgeContract = async function(chainId, initialRelayers, wallet, relayerThreshold = 1, fee = 0, proposalExpiry = 100) {
    console.log(`Deploying bridge contract...`);
    let factory = new ethers.ContractFactory(ContractABIs.Bridge.abi, ContractABIs.Bridge.bytecode, wallet);
    let contract = await factory.deploy(
        chainId.toString(),
        initialRelayers,
        relayerThreshold.toString(),
        ethers.utils.parseEther(fee.toString()),
        proposalExpiry.toString(),
        { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT }
    );
    await contract.deployed();
    return contract.address;
}

const deployERC20Handler = async function(bridgeAddress, wallet) {
    console.log(`Deploying ERC20 Handler...`);
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Handler.abi, ContractABIs.Erc20Handler.bytecode, wallet);
    const contract = await factory.deploy(bridgeAddress, [], [], [], { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

const deployERC20Mintable = async function(erc20Name, erc20Symbol, wallet, decimals = 18) {
    const compiledContract = await compileMintableERC20();
    console.log(`Deploying ERC20 contract...`);
    const factory = new ethers.ContractFactory(compiledContract.abi, compiledContract.evm.bytecode.object, wallet);
    const contract = await factory.deploy(erc20Name, erc20Symbol, decimals, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

const deployMintableCoinFactory = async function(wallet) {
    console.log(`Deploying MintableCoinFactory...`);
    const factory = new ethers.ContractFactory(ContractABIs.MintableCoinFactory.abi, ContractABIs.MintableCoinFactory.bytecode, wallet);
    const contract = await factory.deploy({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await contract.deployed();
    return contract.address;
}

const deployCloneableERC20 = async function(wallet) {
    console.log(`Deploying CloneableMintableERC20...`);
    const factory = new ethers.ContractFactory(ContractABIs.CloneableMintableERC20.abi, ContractABIs.CloneableMintableERC20.bytecode, wallet);
    const contract = await factory.deploy("", "", 0, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await contract.deployed();
    return contract.address;
}

const registerResource = async function(bridgeAddress, handlerAddress, targetTokenAddress, resourceId, chainProvider, wallet) {
    const bridgeInstance = new ethers.Contract(bridgeAddress, ContractABIs.Bridge.abi, wallet);
    const tx = await bridgeInstance.adminSetResource(handlerAddress, resourceId, targetTokenAddress, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await waitForTx(chainProvider, tx.hash);
}

const setCloneableCoinAddress = async function (factoryAddress, cloneableContractAddress, chainProvider, wallet) {
    console.log(`Setting Cloneable address on factory ${factoryAddress}`);
    const factoryContract = new ethers.Contract(factoryAddress, ContractABIs.MintableCoinFactory.abi, wallet);
    const tx = await factoryContract.setMintableContractAddress(cloneableContractAddress);
    await waitForTx(chainProvider, tx.hash);
}

const revokeGrantERC20Role = async function (cloneableERC20Address, role, revoke, address, chainProvider, wallet) {
    let roles = [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
        '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a'
    ]; // admin, minter, pauser
    console.log(`Updating Role ${cloneableERC20Address}`);
    const cloneableERC20 = new ethers.Contract(cloneableERC20Address, ContractABIs.CloneableMintableERC20.abi, wallet);
    if (revoke) {
        const tx = await cloneableERC20.renounceRole(roles[role], address);
        await waitForTx(chainProvider, tx.hash);
    } else {
        const tx = await cloneableERC20.grantRole(roles[role], address);
        await waitForTx(chainProvider, tx.hash);
    }
}

const createRelayerConfig = (chain1Config, chain2Config, srcFactory, destFactory) => {
    return { 
        chains: [chain1Config, chain2Config],
        factories: [srcFactory, destFactory]
    }
}

function createChainConfig(chainName, chainId, bridgeAddress, erc20handlerAddress, endPoint = '', relayerAddress = '') {
    let chainConfig = {
        endPoint,
        from: relayerAddress,
        id: chainId,
        type: "ethereum",
        name: chainName,
        opts: {
            bridge: bridgeAddress,
            erc20Handler: erc20handlerAddress,
            genericHandler: erc20handlerAddress,
            gasLimit: GAS_LIMIT,
            maxGasPrice: GAS_PRICE
        }
    }

    if (endPoint.length && endPoint.startsWith('http')) chainConfig.opts['http'] = 'true';
    return chainConfig;
}

function publishRelayerConfiguration(relayerConfig) {
    let publishPath = path.join(__dirname, '../publish/');
    if (!fs.existsSync(publishPath)) fs.mkdirSync(publishPath);
    let fileName = `bridge-${Date.now()}.json`;
    fs.writeFileSync(publishPath + fileName, JSON.stringify(relayerConfig) , 'utf-8');
    return fileName;
}

exports.deployBridge = new commander.Command("deployBridge")
    .action(async args => {
        try {
            console.log(`Deploying chainsafe's chainbridge... `);

            /**
             * Get providers and
             * wallets for both chains
             */
            let sourceChainProvider, destinationChainProvider,
            sourceWallet, destinationWallet;
            let _res = getWalletAndProvider(process.env.SRC_CHAIN_RPC_HTTPS, process.env.SRC_CHAIN_PRIVATE_KEY, Number(process.env.SRC_CHAIN_NETWORK_ID));
            sourceWallet = _res.chainWallet;
            sourceChainProvider = _res.chainProvider;
            _res = getWalletAndProvider(process.env.DEST_CHAIN_RPC_HTTPS, process.env.DEST_CHAIN_PRIVATE_KEY, Number(process.env.DEST_CHAIN_NETWORK_ID));
            destinationWallet = _res.chainWallet;
            destinationChainProvider = _res.chainProvider;

            /**
             * Deployment of main
             * bridge and handler contracts
             */
            const sourceBridgeAddress = await deployBridgeContract(SRC_CHAIN_DEFAULT_ID, [], sourceWallet, Number(process.env.BRIDGE_TRANSFER_FEE));
            const sourceHandlerAddress = await deployERC20Handler(sourceBridgeAddress, sourceWallet);
            const destBridgeAddress = await deployBridgeContract(DEST_CHAIN_DEFAULT_ID, [], destinationWallet, Number(process.env.BRIDGE_TRANSFER_FEE));
            const destHanderAddress = await deployERC20Handler(destBridgeAddress, destinationWallet);

            /**
             * Deploy mintable factory
             * contract
             */
            const srcMintableCoinFactoryAddress = await deployMintableCoinFactory(sourceWallet);
            const srcCloneableMintableERC20Address = await deployCloneableERC20(sourceWallet);
            const dstMintableCoinFactoryAddress = await deployMintableCoinFactory(destinationWallet);
            const dstCloneableMintableERC20Address = await deployCloneableERC20(destinationWallet);

            // renounceRole AS MINTER, PAUSER, ADMIN give admin to factory
            await setCloneableCoinAddress(srcMintableCoinFactoryAddress, srcCloneableMintableERC20Address, sourceChainProvider, sourceWallet);
            await revokeGrantERC20Role(srcCloneableMintableERC20Address, 1, true, process.env.SRC_ADDRESS, sourceChainProvider, sourceWallet);
            await revokeGrantERC20Role(srcCloneableMintableERC20Address, 2, true, process.env.SRC_ADDRESS, sourceChainProvider, sourceWallet);
            await revokeGrantERC20Role(srcCloneableMintableERC20Address, 0, false, srcMintableCoinFactoryAddress, sourceChainProvider, sourceWallet);
            await revokeGrantERC20Role(srcCloneableMintableERC20Address, 0, true, process.env.SRC_ADDRESS, sourceChainProvider, sourceWallet);

            await setCloneableCoinAddress(dstMintableCoinFactoryAddress, dstCloneableMintableERC20Address, destinationChainProvider, destinationWallet);
            await revokeGrantERC20Role(dstCloneableMintableERC20Address, 1, true, process.env.DEST_ADDRESS, destinationChainProvider, destinationWallet);
            await revokeGrantERC20Role(dstCloneableMintableERC20Address, 2, true, process.env.DEST_ADDRESS, destinationChainProvider, destinationWallet);
            await revokeGrantERC20Role(dstCloneableMintableERC20Address, 0, false, dstMintableCoinFactoryAddress, destinationChainProvider, destinationWallet);
            await revokeGrantERC20Role(dstCloneableMintableERC20Address, 0, true, process.env.DEST_ADDRESS, destinationChainProvider, destinationWallet);


            // let resources = [];
            // if (process.env.SRC_TOKEN.length) {
            //     // Registration one "source" side
            //     await registerResource(sourceBridgeAddress, sourceHandlerAddress, process.env.SRC_TOKEN, process.env.RESOURCE_ID, sourceChainProvider, sourceWallet);
            //     // mintable deployment on "dest" side
            //     const wrappedERC20Address = await deployERC20Mintable(`Wrapped ${process.env.TARGET_TOKEN_NAME}`, `Wrapped ${process.env.TARGET_TOKEN_NAME}`, destinationWallet, process.env.SRC_DECIMALS);
            //     await registerResource(destBridgeAddress, destHanderAddress, wrappedERC20Address, process.env.RESOURCE_ID, destinationChainProvider, destinationWallet);
            //     let bridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);
            //     let tx = await bridgeInstance.adminSetBurnable(destHanderAddress, wrappedERC20Address, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
            //     await waitForTx(destinationChainProvider, tx.hash);
            //     // change deploy mintable erc20 owner to multi and multi sig will 
            //     // grant minter role to handler but lets go simple for now
            //     const erc20Instance = new ethers.Contract(wrappedERC20Address, ContractABIs.Erc20Mintable.abi, destinationWallet);
            //     let MINTER_ROLE = await erc20Instance.MINTER_ROLE();
            //     tx = await erc20Instance.grantRole(MINTER_ROLE, destHanderAddress);
            //     await waitForTx(destinationChainProvider, tx.hash);
            //     resources.push({ tokens: { [SRC_CHAIN_DEFAULT_ID]: process.env.SRC_TOKEN, [DEST_CHAIN_DEFAULT_ID]: wrappedERC20Address }, resourceId: process.env.RESOURCE_ID });
            // }

            if (process.env.SRC_MULTISIG.length && process.env.DEST_MULTISIG.length) {
                let srcbridgeInstance = new ethers.Contract(sourceBridgeAddress, ContractABIs.Bridge.abi, sourceWallet);
                let destbridgeInstance = new ethers.Contract(destBridgeAddress, ContractABIs.Bridge.abi, destinationWallet);

                let tx = await srcbridgeInstance.renounceAdmin(process.env.SRC_MULTISIG);
                await waitForTx(tx, tx.hash);
                console.log(`Transferred ${process.env.SRC_CHAIN_NAME} bridge ownership to ${process.env.SRC_MULTISIG}`);

                tx = await destbridgeInstance.renounceAdmin(process.env.DEST_MULTISIG);
                await waitForTx(tx, tx.hash);
                console.log(`Transferred ${process.env.DEST_CHAIN_NAME} bridge ownership to ${process.env.DEST_MULTISIG}`);
            }

            let srcBridgeConfig = createChainConfig(process.env.SRC_CHAIN_NAME,
                SRC_CHAIN_DEFAULT_ID.toString(),
                sourceBridgeAddress,
                sourceHandlerAddress,
                process.env.SRC_CHAIN_RPC_WS.length ? process.env.SRC_CHAIN_RPC_WS : process.env.SRC_CHAIN_RPC_HTTPS,
                undefined);
            let dstBridgeConfig = createChainConfig(process.env.DEST_CHAIN_NAME,
                DEST_CHAIN_DEFAULT_ID.toString(),
                destBridgeAddress,
                destHanderAddress,
                process.env.DEST_CHAIN_RPC_WS.length ? process.env.DEST_CHAIN_RPC_WS : process.env.DEST_CHAIN_RPC_HTTPS,
                undefined
            )
            let relayerConfig = createRelayerConfig(srcBridgeConfig, dstBridgeConfig, srcMintableCoinFactoryAddress, dstMintableCoinFactoryAddress);
            let fileName = publishRelayerConfiguration(relayerConfig);

            console.log(`⚙️  ${fileName} created to run as the first relayer!`);

        } catch (err) {
            console.log(err)
        }
});
