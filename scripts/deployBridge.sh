#!/bin/bash
cd env;set -a; . deploy.env; set +a;
cd relayer
make build
cd ../relayer
./build/chainbridge accounts import --privateKey $SRC_CHAIN_PRIVATE_KEY
./build/chainbridge accounts import --privateKey $DEST_CHAIN_PRIVATE_KEY
read -p "Start relayer (y/n)?" choice
case "$choice" in 
  y|Y ) cp ../publish/config.json config.json; ./build/chainbridge --config config.json --verbosity trace --latest
esac