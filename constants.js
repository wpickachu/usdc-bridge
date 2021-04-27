const path = require('path');

exports.SRC_CHAIN_DEFAULT_ID = 0;
exports.DEST_CHAIN_DEFAULT_ID = 1;
exports.GAS_PRICE = 100000000000;
exports.GAS_LIMIT = 8000000;

const CONTRACT_PATH = path.join(__dirname, '/contracts');
exports.ContractABIs = {
    Bridge: require(CONTRACT_PATH + "/build/Bridge.json"),
    Erc20Handler: require(CONTRACT_PATH + "/build/ERC20Handler.json"),
    Erc20Mintable: require(CONTRACT_PATH + "/build/ERC20PresetMinterPauser.json"),
    Erc721Handler: require(CONTRACT_PATH + "/build/ERC721Handler.json"),
    Erc721Mintable: require(CONTRACT_PATH + "/build/ERC721MinterBurnerPauser.json"),
    GenericHandler: require(CONTRACT_PATH + "/build/GenericHandler.json"),
    CentrifugeAssetStore: require(CONTRACT_PATH + "/build/CentrifugeAsset.json"),
    WETC: require(CONTRACT_PATH + "/WETC.json"),
    HandlerHelpers: require(CONTRACT_PATH + "/build/HandlerHelpers.json"),
    MintableCoinFactory: require(CONTRACT_PATH + "/build/MintableCoinFactory.json"),
    CloneableMintableERC20: require(CONTRACT_PATH + "/build/CloneableMintableERC20.json")
}