#!/usr/bin/env node

/* eslint-env node */

// Stakeholders are:
//     package.json
//     package-lock.json
//     Current Node version (process.versions.node)
//     .npmrc
//
// Note:
//     Not considering npm version as a stakeholder. Assuming that we are using the version of npm which is built-in with Node.
//     Not considering npm scripts (eg: postinstall) and dependencies of those scripts (eg: postinstall calling a custom script which can cause side-effects in node_modules) as a stakeholder.

var path = require('path'),
    fs = require('fs'),
    crypto = require('crypto');

var { promisify } = require('util'),
    readFile = promisify(fs.readFile);

var stableStringify = require('./3rdparty/json-stable-stringify.js');

// https://gist.github.com/adam-lynch/11037907
var _invalidateRequireCacheForFile = function(filePath){
    delete require.cache[path.resolve(filePath)];
};
var requireNoCache =  function(filePath){
    _invalidateRequireCacheForFile(filePath);
    return require(filePath);
};

var generateSerializedStakeHolders = async function (options) {
    var { projectRoot } = options;

    var packageJson;
    try { packageJson = requireNoCache(path.resolve(projectRoot, 'package.json')); } catch (e) { /* do nothing */ }

    var packageLockJson;
    try { packageLockJson = requireNoCache(path.resolve(projectRoot, 'package-lock.json')); } catch (e) { /* do nothing */ }

    var nodeVersion = process.versions.node;

    var strNpmrc;
    try { strNpmrc = await readFile(path.resolve(projectRoot, '.npmrc'), 'utf8'); } catch (e) { /* do nothing */ }

    var stakeholders = {};
    if (packageJson) {
        stakeholders.packageJson = {};
        if (packageJson.dependencies) { stakeholders.packageJson.dependencies = packageJson.dependencies; }
        if (packageJson.devDependencies) { stakeholders.packageJson.devDependencies = packageJson.devDependencies; }
    }
    if (packageLockJson) {
        stakeholders.packageLockJson = {};
        if (packageLockJson.dependencies) { stakeholders.packageLockJson.dependencies = packageLockJson.dependencies; }
        if (packageLockJson.lockfileVersion) { stakeholders.packageLockJson.lockfileVersion = packageLockJson.lockfileVersion; }
        if (packageLockJson.packageIntegrity) { stakeholders.packageLockJson.packageIntegrity = packageLockJson.packageIntegrity; }
    }
    if (strNpmrc) {
        stakeholders.strNpmrc = strNpmrc;
    }
    if (nodeVersion) {
        stakeholders.nodeVersion = nodeVersion;
    }

    var serializedStakeholders = stableStringify(stakeholders);
    return serializedStakeholders;
};

var getSHA512Hash = function (str) {
    var sha = crypto.createHash('sha512').update(str),
        result = sha.digest('hex');
    return result;
};

var generateHash = async function (options) {
    var serializedStakeholders = await generateSerializedStakeHolders(options),
        hash = getSHA512Hash(serializedStakeholders);
    return hash;
};

var generateShortHash = async function (options) {
    var hash = await generateHash(options),
        shortHash = hash.substr(0, 16);
    return shortHash;
};

module.exports = generateShortHash;