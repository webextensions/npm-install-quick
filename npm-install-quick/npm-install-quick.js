#!/usr/bin/env node

var path = require('path');

var npmInstallQuick = require('./lib/main.js');

npmInstallQuick({
    argv: process.argv,
    projectRoot: path.resolve(__dirname, '..'),
    archiveDirectory: '/var/tmp/npm-install-quick/archive',     // Use such a path to keep the archived node_modules contents in a shared temporary folder
    // archiveDirectory: 'node_modules-archive/archive',        // Use such a path to keep the archived node_modules contents within the project directory
    showDiskSpaceWarningBelow: 10 * 1024 * 1024 * 1024          // Warn if free disk space for the partition containing "archiveDirectory" is less than 10 GB
});
