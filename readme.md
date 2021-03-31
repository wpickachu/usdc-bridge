# Bridge deployment for Edgware <-> Ethereum
[Chainbridge](https://github.com/ChainSafe/ChainBridge) is an extensible cross-chain communication protocol. It currently supports bridging between EVM and Substrate based chains.

A bridge contract (or pallet in Substrate) on each chain forms either side of a bridge. Handler contracts allow for customizable behavior upon receiving transactions to and from the bridge. For example locking up an asset on one side and minting a new one on the other. Its highly customizable - you can deploy a handler contract to perform any action you like.

In its current state ChainBridge operates under a trusted federation model. Deposit events on one chain are detected by a trusted set of off-chain relayers who await finality, submit events to the other chain and vote on submissions to reach acceptance triggering the appropriate handler.

# Available on testnet
Chain bridge contract has been successfully deployed on Rinkeby and Beresheet test networks, however since we are yet to deploy a full fledged testing model
its functionality is limited to only 1 validator which is owned by test net account of a dtrade dev and a custom USDC contract deployed on Rinkeby with 18 decimal places.
Contract address are:
* Beresheet\
  Bridge: 0x02bd5bd3e941013a21dbf7d0621c9ed6f1b68710\
  Handler: 0x34e313673e8db2f7d107a0c55a606110418d83cc\
  UDSC: 0x67f18018bc5fe330f3f64197160d8e40a08c6fa1
* Rinkeby\
  Bridge: 0xb2b5148452764c37015c51f0f0a56600f00d82c2\
  Handler: 0x80bbadb9bc9c71c5ef8f2682514bf88e7a0205fe\
  USDC: 0xec596280e4bc4d79044f8b0561b9a7d33e5e7cdc
## Deployment
To deploy contracts on either side of the bridge,.

## Token Transfers

To execute a transfer on either side of the bridge two calls are required.
1. An **approve** call from ERC20 contract on source/destination bridge with address of handler contract deployed and cofigured on chain,
2. A **deposit** call to the bridge should originate from the address that is willing to spend with first parameter being chainId (destination), resource id of the token that needs to be transferred, data is a concatenated byte value with first 32 byte is the amount of tokens to transfer which is padded to 32 bytes with extra 0s, 2nd being the length of recipient address also padded to 32 bytes and last part containing the actual recipient address.


## Whats Next
A contracts needs to be created that allows multiple addresses to become administrators of the bridge contract on both sides of the bridge so that core bridge functionalities such as increasing the number of relayers required to validate transactions, add support for more ERC20 tokens can be further broken down into a governance type model.
