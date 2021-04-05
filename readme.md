#  Bridge deployment for Edgware <-> Ethereum  
[Chainbridge](https://github.com/ChainSafe/ChainBridge) is an extensible cross-chain communication protocol. It currently supports bridging between EVM and Substrate based chains.
A bridge contract (or pallet in Substrate) on each chain forms either side of a bridge. Handler contracts allow for customizable behavior upon receiving transactions to and from the bridge. For example locking up an asset on one side and minting a new one on the other. Its highly customizable - you can deploy a handler contract to perform any action you like.
In its current state ChainBridge operates under a trusted federation model. Deposit events on one chain are detected by a trusted set of off-chain relayers who await finality, submit events to the other chain and vote on submissions to reach acceptance triggering the appropriate handler.  

##  Deployment
1. To deploy contracts on either side of the bridge, we need to first set the following variables in ```deploy.env``` file within ```env`` folder.

| Variable | Description |
| ----------- | ----------- |
| SRC_CHAIN_RPC_HTTPS | RPC Url of source chain |
| SRC_CHAIN_RPC_WS | WS Url of source chain |
| SRC_CHAIN_NETWORK_ID | Network id of chain e.g 1 for Eth main net. |
| SRC_CHAIN_NAME | Chain name e.g Ethereum |
| SRC_ADDRESS | Public Address of the account which will be used to deploy bridge contracts on source chain. |
| SRC_CHAIN_PRIVATE_KEY | Private key of the address which will be used to deploy bridge contracts on source chain. |
| SRC_TOKEN | Contract address of the token that will be transferred over the bridge |
| DEST_CHAIN_RPC_HTTPS | RPC Url of destination chain |
| DEST_CHAIN_RPC_WS | WS RPC Url of destination chain |
| DEST_CHAIN_NETWORK_ID | Network id of chain e.g 2021 for Beresheet. |
| DEST_CHAIN_NAME | Chain name e.g Edgeware |
| DEST_ADDRESS | Public Address of the account which will be used to deploy bridge contracts on destination chain. |
| DEST_CHAIN_PRIVATE_KEY | Private key of the address which will be used to deploy bridge contracts on destination chain. |
| RESOURCE_ID | Arbitrary 32 byte hex string that is used to identify specific token transfer on either side of the bridge|
| TARGET_TOKEN_NAME | ERC20 Token name that will be transferred over the bridge |
| TARGET_TOKEN_SYMBOL | ERC20 Token symbol that will be transferred over the bridge |

2. After initializing all the values, run ```yarn deploy``` to deploy the bridge. This will deploy all the contracts required for the bridge to work on both chains.

## Run validator
To setup a validator on local machine, following steps are required:

1. Build validator executable by isssuing the ```make build``` command within relayer directory.
2. Update ```relayer.env``` file in env directory with private keys and public addresses of both chains that are verified as a validator.
3. run ```yarn start-relayer``` within the root directory.

##  Token Transfers

To execute a transfer on either side of the bridge two calls are required.
1. An **approve** call from ERC20 contract on source/destination bridge with address of handler contract deployed and cofigured on chain,
2. A **deposit** call to the bridge should originate from the address that is willing to spend with first parameter being chainId (destination), resource id of the token that needs to be transferred, data is a concatenated byte value with first 32 byte is the amount of tokens to transfer which is padded to 32 bytes with extra 0s, 2nd being the length of recipient address also padded to 32 bytes and last part containing the actual recipient address.

##  Whats Next
Add gnosis multisafe wallet as an admin on both sides of the bridge to have trusted set of validators.