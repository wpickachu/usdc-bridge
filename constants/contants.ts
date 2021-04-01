import * as path from 'path';
export const SRC_CHAIN_DEFAULT_ID = 0;
export const DEST_CHAIN_DEFAULT_ID = 1;
export const GAS_PRICE = 10000000000;
export const GAS_LIMIT = 8000000;
const CONTRACT_PATH = path.join(__dirname, '../contracts');
export const ContractABIs = {
    Bridge: require(CONTRACT_PATH + "/build/Bridge.json"),
    Erc20Handler: require(CONTRACT_PATH + "/build/ERC20Handler.json"),
    Erc20Mintable: require(CONTRACT_PATH + "/build/USDCToken.json"),
    Erc721Handler: require(CONTRACT_PATH + "/build/ERC721Handler.json"),
    Erc721Mintable: require(CONTRACT_PATH + "/build/ERC721MinterBurnerPauser.json"),
    GenericHandler: require(CONTRACT_PATH + "/build/GenericHandler.json"),
    CentrifugeAssetStore: require(CONTRACT_PATH + "/build/CentrifugeAsset.json"),
    WETC: require(CONTRACT_PATH + "/WETC.json"),
    HandlerHelpers: require(CONTRACT_PATH + "/build/HandlerHelpers.json")
}