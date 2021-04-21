#!/bin/bash

set -a; . ./env/relayer.env; set +a;
cd ./relayer;

SPKFILE=keys/"$SRC_ADDR".key
if [ ! -f "$SPKFILE" ]; then
./build/chainbridge accounts import --privateKey $SRC_PK
fi

DPKFILE=keys/"$DEST_ADDR".key
if [ ! -f "$DPKFILE" ]; then 
./build/chainbridge accounts import --privateKey $DEST_PK
fi