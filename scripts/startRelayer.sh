#!/bin/bash
cd env; . relayer.env;
cd ../relayer;
sudo make build;
export KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD
./build/chainbridge --config config.json --verbosity trace --latest