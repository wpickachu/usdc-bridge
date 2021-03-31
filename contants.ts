import * as path from 'path';
export const SRC_CHAIN_DEFAULT_ID = 0;
export const DEST_CHAIN_DEFAULT_ID = 1;
export const GAS_PRICE = 20000000;
export const GAS_LIMIT = 8000000;
const CONTRACT_PATH = path.join(__dirname + '/contracts/build');
export const ContractABIs = {
    Bridge: require(CONTRACT_PATH + "/Bridge.json"),
    Erc20Handler: require(CONTRACT_PATH + "/ERC20Handler.json"),
    Erc20Mintable: require(CONTRACT_PATH + "/ERC20PresetMinterPauser.json"),
    Erc721Handler: require(CONTRACT_PATH + "/ERC721Handler.json"),
    Erc721Mintable: require(CONTRACT_PATH + "/ERC721MinterBurnerPauser.json"),
    GenericHandler: require(CONTRACT_PATH + "/GenericHandler.json"),
    CentrifugeAssetStore: require(CONTRACT_PATH + "/CentrifugeAsset.json"),
    WETC: require("./contracts/WETC.json"),
    HandlerHelpers: require(CONTRACT_PATH + "/HandlerHelpers.json")
}