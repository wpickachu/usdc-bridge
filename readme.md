# Bridge deployment for Edgware(EVM) <-> Ethereum
[Chainbridge](https://github.com/ChainSafe/ChainBridge) is a multisig bridge that helps transfer ERC20 tokens between two chains, it supports EVM or substrate based chains.
## Deployment
To deploy contracts on either side of the bridge, chainbridge has provided official [CLI](https://github.com/ChainSafe/chainbridge-deploy) we recommend setting it up before proceeding.

### 1. Setting Environment Variables
Before we start deployment we first need to initialize following environment variables which will we used throughout the deployment process.
```console
SRC_GATEWAY=<RPC_URL_SOURCE_CHAIN>
DST_GATEWAY=<RPC_URL_DESTINATION_CHAIN>
SRC_ADDR="<PUBLIC_ADDRESS_SOURCE_CHAIN>"
SRC_PK="<PRIV_KEY_SOURCE_CHAIN>"
DST_ADDR="<PUBLIC_ADDRESS_DEST_CHAIN>"
DST_PK="<PRIV_KEY_DEST_CHAIN>"
SRC_TOKEN="<TARGET_TOKEN_CONTRACT_ADDRESS_SRC>"
RESOURCE_ID="<RANDOM_32_BYTE_STRING_THAT_IDENTIFIES_TOKEN_ON_EITHER_SIDE>"
SRC_BRIDGE="<SET_DURING_DEPLOYMENT>"
SRC_HANDLER="<SET_DURING_DEPLOYMENT>"
DST_BRIDGE="<SET_DURING_DEPLOYMENT>"
DST_HANDLER="<SET_DURING_DEPLOYMENT>"
DST_TOKEN="<SET_DURING_DEPLOYMENT>"
```
These variables can be written to a file **vars** and can be loaded into the shell by using the command 
```console
set -a;source ./vars;set +a
``` 

### 2. Steps

1. First step in the deployment process is to deploy chainbridge contracts on the source chain.
```console
cb-sol-cli --url $SRC_GATEWAY --privateKey $SRC_PK --gasPrice 10000000000 deploy \--bridge --erc20Handler \--relayers $SRC_ADDR \--relayerThreshold 1\ --chainId 0
```
2. Once the bridge contracts have been deployed on the source chain, chainbridge-cli will provide us the contract addresses. These two addresses for bridge and handler can be pasted into the environment variables file we created as **SRC_BRIDGE** and **SRC_HANDLER** respectively.
3. Configure the bridge contract to register the source token on the bridge and also configure the handler to be used with the command
```console
cb-sol-cli --url $SRC_GATEWAY --privateKey $SRC_PK --gasPrice 10000000000 bridge register-resource \ --bridge $SRC_BRIDGE  \ --handler $SRC_HANDLER  \ --resourceId $RESOURCE_ID  \ --targetContract $SRC_TOKEN
```
4. Deploy bridge contracts on the destination chain using the following command
```console
cb-sol-cli --url $DST_GATEWAY --privateKey $DST_PK --gasPrice 10000000000 deploy\ --bridge --erc20 --erc20Handler \ --relayers $DST_ADDR  \ --relayerThreshold 1  \ --chainId 1
```
**Note:** If you are willing to use an existing ERC20 contract on the destination chain, it needs to have mintable/burnable properties and handler contract to be configured as minter/burner. Deploy contracts without the ERC20 parameters.

5. Take a note of contract addresses after the contracts have been deployed on destination chain which will give us addresses for **DST_BRIDGE**,**DST_HANDLER** and **DST_TOKEN**.
6. We now configure the newly deployed bridge on destination chain to determine which handlers to use and how to burn/mint tokens when they are transferred to and from the chain.
```console
cb-sol-cli --url $DST_GATEWAY --privateKey $DST_PK --gasPrice 10000000000 bridge register-resource \ --bridge $DST_BRIDGE  \ --handler $DST_HANDLER  \ --resourceId $RESOURCE_ID  \ --targetContract $DST_TOKEN
```
```console
cb-sol-cli --url $DST_GATEWAY --privateKey $DST_PK --gasPrice 10000000000 bridge set-burn \ --bridge $DST_BRIDGE  \ --handler $DST_HANDLER  \ --tokenContract $DST_TOKEN
```
```console
cb-sol-cli --url $DST_GATEWAY --privateKey $DST_PK --gasPrice 10000000000 erc20 add-minter \ --minter $DST_HANDLER  \ --erc20Address $DST_TOKEN
```
7. To create an off chain listener that actually listens to events happening on either side of the chain and validate them we need to build the relayer provided on official chainbridge [repo](https://github.com/ChainSafe/chainbridge).
```console
git clone -b v1.0.0 --depth 1 https://github.com/ChainSafe/chainbridge \  &&  cd chainbridge \  && make build
```
8. The relayer from previous step needs to know what chain should it listen to and what are the addresses of bridge contracts, therefore, we create a config file that will initialize listener with newly created parameters.  
```console
echo  "{  \"chains\": [  {  \"name\": \"Ethereum\",  \"type\": \"ethereum\",  \"id\": \"0\",  \"endpoint\": \"<SRC_URL>",  \"from\": \"$SRC_ADDR\",  \"opts\": {  \"bridge\": \"$SRC_BRIDGE\",  \"erc20Handler\": \"$SRC_HANDLER\",  \"genericHandler\": \"$SRC_HANDLER\",  \"gasLimit\": \"1000000\",  \"maxGasPrice\": \"10000000000\"  }  },  {  \"name\": \"Edgeware\",  \"type\": \"ethereum\",  \"id\": \"1\",  \"endpoint\": \"DST_URL",  \"from\": \"$DST_ADDR\",  \"opts\": {  \"bridge\": \"$DST_BRIDGE\",  \"erc20Handler\": \"$DST_HANDLER\",  \"genericHandler\": \"$DST_HANDLER\",  \"gasLimit\": \"1000000\",  \"maxGasPrice\": \"10000000000\"  }  }  ]  }" >> config.json
```
9. The relayer maintains its own keystore, so we have to import private keys of the accounts that will be validating events on both side of the bridge. We do that by executing the following two commands
```console
./build/chainbridge accounts import --privateKey $SRC_PK
```
```console
./build/chainbridge accounts import --privateKey $DST_PK
```
10. Start the relayer by running the following command
```console
./build/chainbridge --config ./config.json --verbosity trace --latest
```
If the deployment was successful the layer should show logs similar to
```
![plot](./bridge.png)
```