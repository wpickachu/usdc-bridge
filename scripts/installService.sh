#!/bin/bash
cd env; . relayer.env; cd ..;
{
    echo '[Unit]'
    echo 'Description=EdgewareBridge'
    echo '[Service]'
    echo 'Type=exec'
    echo 'WorkingDirectory='`pwd`
    echo 'Environment="KEYSTORE_PASSWORD='$KEYSTORE_PASSWORD'"'
    echo 'Environment="HOME='$HOME'"'
    echo 'ExecStart='`pwd`'/scripts/startRelayer.sh'
    echo 'Restart=on-failure'
    echo 'RestartSec=3s'
    echo '[Install]'
    echo 'WantedBy=multi-user.target'
} > /etc/systemd/system/edgbridge.service