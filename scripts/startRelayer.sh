#!/bin/bash
cd env; . relayer.env;
cd ../relayer;
./build/chainbridge --config config.json --verbosity trace --latest