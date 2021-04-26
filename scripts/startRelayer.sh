#!/bin/bash
cd env; . relayer.env;
cd ../relayer;
export KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD
./build/chainbridge --config config.json --verbosity trace --latest