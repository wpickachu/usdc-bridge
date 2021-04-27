#  Bridge deployment for Edgeware <-> Ethereum  
[Chainbridge](https://github.com/ChainSafe/ChainBridge) is an extensible cross-chain communication protocol. It currently supports bridging between EVM and Substrate based chains.
A bridge contract (or pallet in Substrate) on each chain forms either side of a bridge. Handler contracts allow for customizable behavior upon receiving transactions to and from the bridge. For example locking up an asset on one side and minting a new one on the other. Its highly customizable - you can deploy a handler contract to perform any action you like.
In its current state ChainBridge operates under a trusted federation model. Deposit events on one chain are detected by a trusted set of off-chain relayers who await finality, submit events to the other chain and vote on submissions to reach acceptance triggering the appropriate handler.  

## Dependancies (Linux)
  Install node dependancies using
  ``` yarn install ```
  
  Install make for linux using
  ``` sudo apt-get install build-essential ```
  
  Install go using
  ```
  wget -c https://dl.google.com/go/go1.14.2.linux-amd64.tar.gz -O - | sudo tar -xz -C /usr/local

  export PATH=$PATH:/usr/local/go/bin
  source ~/.profile

  # go version go1.14.2 linux/amd64
  go version

  mkdir ~/go
  ```

  
##  Deployment
1. To deploy contracts on either side of the bridge, we need to first set the following variables in ```deploy.env``` file within ```env``` folder.
```
SRC_CHAIN_NETWORK_ID=
SRC_CHAIN_NAME=
SRC_ADDRESS=
SRC_CHAIN_PRIVATE_KEY=
SRC_CHAIN_RPC_HTTPS=
# ws url is optional, chainbridge works with https but ws is preffered
SRC_CHAIN_RPC_WS=
# multisig address is optional setting it will change admin of bridge to specified address
SRC_MULTISIG=

DEST_CHAIN_NETWORK_ID=
DEST_CHAIN_NAME=
DEST_ADDRESS=
DEST_CHAIN_PRIVATE_KEY=
DEST_CHAIN_RPC_HTTPS=
# ws url is optional, chainbridge works with https but ws is preffered
DEST_CHAIN_RPC_WS=
# multisig address is optional setting it will change admin of bridge to specified address
DEST_MULTISIG=

# 32 BYTE HEX string that identifies token on either side of the bridge
# src token is the address of erc20 on source chain
SRC_TOKEN=
# decimal places of erc20
SRC_DECIMALS=
# 32 byte random hex string for identifying this token over the bridge. Note least significant byte must contain a chain ID
RESOURCE_ID=
# Token Name and Symbol that gets deployed on destination chain
TARGET_TOKEN_NAME=
TARGET_TOKEN_SYMBOL=

# in Wei
BRIDGE_TRANSFER_FEE=
```
2. After initializing all the values, run ```yarn deploy``` to deploy the bridge. This will deploy all the contracts required for the bridge to work on both chains.

## Setup relayer
To run as a relayer on one of deployed bridge, the following steps are required:
1.  Get ```relayer``` role granted on the bridge where you want to run as a relayer.
2.  Setup the repository.
3.  Rename ```relayer.env.example``` to ```relayer.env``` within env directory and set these environment variables.
```bash
CH1_ADDR=
CH1_PK=

CH2_ADDR=
CH2_PK=
KEYSTORE_PASSWORD=
```
4.  run ```yarn setup-relayer``` to create a configuration file for an existing bridge.

**Note:** If the scripts fail to run due to permission errors, please provide execution permission to all the files in the scripts folder.

## Start Relayer
Copmplete setting up the relayer config using setup relayer section and run ```yarn start-relayer```.

## Install Service
Copmplete setting up the relayer config using setup relayer section and run ```yarn install-service```.

##  Token Transfers

To execute a transfer on either side of the bridge two calls are required.
1. An **approve** call from ERC20 contract on source/destination bridge with address of handler contract deployed and configured on chain,
2. A **deposit** call to the bridge should originate from the address that is willing to spend with first parameter being chainId (destination), resource id of the token that needs to be transferred, data is a concatenated byte value with first 32 byte is the amount of tokens to transfer which is padded to 32 bytes with extra 0s, 2nd being the length of recipient address also padded to 32 bytes and last part containing the actual recipient address.

