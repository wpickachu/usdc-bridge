#!/bin/bash
cd env; . relayer.env;
cd ../relayer;
docker run -e KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD -v `pwd`/config.json:/config.json -v `pwd`/keys:/keys chainsafe/chainbridge