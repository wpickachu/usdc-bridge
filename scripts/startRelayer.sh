#!/bin/bash
cd env;
set -a;
. relayer.env;
set +a;
cd relayer
make build
cd ../relayer
./build/chainbridge accounts import --privateKey $RSRC_CHAIN_PRIVATE_KEY
./build/chainbridge accounts import --privateKey $RDEST_CHAIN_PRIVATE_KEY

./build/chainbridge --config config.json --verbosity trace --latest