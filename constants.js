const path = require('path');

exports.SRC_CHAIN_DEFAULT_ID = 0;
exports.DEST_CHAIN_DEFAULT_ID = 1;
exports.GAS_PRICE = 10000000000;
exports.GAS_LIMIT = 8000000;

const CONTRACT_PATH = path.join(__dirname, '/contracts');
exports.ContractABIs = {
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