#!/bin/bash

# cd to the folder containing this script
cd "$(dirname "$0")"

set -x
./npm-install-quick/npm-install-quick.js --package-lock-must-be-in-sync-when-available
