#!/bin/bash
cd env; . relayer.env;
cd ../relayer;
docker pull chainsafe/chainbridge
docker run -e KEYSTORE_PASSWORD=12345678 -v `pwd`/config.json:/config.json -v `pwd`/keys:/keys chainsafe/chainbridge