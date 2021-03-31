import { ethers } from "ethers";
import { ContractABIs, GAS_PRICE, GAS_LIMIT } from "./contants";
import { waitForTx } from "./utils";

export function getWalletAndProvider(rpcUrl: string, privateKey: string, chainNetworkId: number = undefined) {
    let chainProvider = chainNetworkId ? new ethers.providers.JsonRpcProvider(rpcUrl) : new ethers.providers.JsonRpcProvider(rpcUrl, {
        name: "custom",
        chainId: chainNetworkId
    });
    let chainWallet = new ethers.Wallet(privateKey, chainProvider);
    return { chainProvider, chainWallet };
}

export async function registerResource(bridgeAddress: string, handlerAddress: string, targetTokenAddress: string, resourceId: string, chainProvider: ethers.providers.JsonRpcProvider, wallet: ethers.Wallet) {
    const bridgeInstance = new ethers.Contract(bridgeAddress, ContractABIs.Bridge.abi, wallet);
    const tx = await bridgeInstance.adminSetResource(handlerAddress, resourceId, targetTokenAddress, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT });
    await waitForTx(chainProvider, tx.hash);
}

export async function deployBridgeContract(chainId: number, initialRelayers: string[], wallet: ethers.Wallet, relayerThreshold: number = 1, fee: number = 0, proposalExpiry: number = 100) {
    let factory = new ethers.ContractFactory(ContractABIs.Bridge.abi, ContractABIs.Bridge.bytecode, wallet);
    let contract = await factory.deploy(
        chainId,
        initialRelayers,
        relayerThreshold,
        ethers.utils.parseEther(fee.toString()),
        proposalExpiry,
        { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT}
    );
    await contract.deployed();

    return contract.address;
}

export async function deployERC20Mintable(erc20Name: string, erc20Symbol: string, wallet: ethers.Wallet) {
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Mintable.abi, ContractABIs.Erc20Mintable.bytecode, wallet);
    const contract = await factory.deploy(erc20Name, erc20Symbol, { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}

export async function deployERC20Handler(bridgeAddress: string, wallet: ethers.Wallet) {
    const factory = new ethers.ContractFactory(ContractABIs.Erc20Handler.abi, ContractABIs.Erc20Handler.bytecode, wallet);
    const contract = await factory.deploy(bridgeAddress, [], [], [], { gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT});
    await contract.deployed();
    return contract.address;
}
