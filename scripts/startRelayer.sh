#!/bin/bash
cd env;
set -a;
. relayer.env;
set +a;
cd relayer
make build
cd ../relayer

SPKFILE=keys/"$RSRC_ADDRESS".key
echo $SPKFILE
if [ ! -f "$SPKFILE" ]; then
./build/chainbridge accounts import --privateKey $RSRC_CHAIN_PRIVATE_KEY
fi

DPKFILE=keys/"$RDEST_ADDRESS".key
if [ ! -f "$DPKFILE"]; then 
./build/chainbridge accounts import --privateKey $RDEST_CHAIN_PRIVATE_KEY
fi

./build/chainbridge --config config.json --verbosity trace --latest