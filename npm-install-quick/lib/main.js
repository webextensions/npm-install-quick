#!/usr/bin/env node

/* eslint-env node */

var path = require('path'),
    fs = require('fs');

var semver = require('./utils/3rdparty/semver.js');

var generateStakeholdersHash = require('./utils/generateHashFromStakeholders.js');

var { spawn, exec } = require('./utils/run-command.js');

var lockedVersionsSatisfy = function (intendedDependencies = {}, installedDependencies = {}) {
    var allVersionsSatisfied = Object.keys(intendedDependencies).every(function (key) {
        var intendedDependency = intendedDependencies[key],
            installedDependency = installedDependencies[key];
        if (installedDependency && semver.satisfies(installedDependency.version, intendedDependency)) {
            return true;
        } else {
            return false;
        }
    });
    return allVersionsSatisfied;
};

var arePackageJsonAndPackageLockJsonInSync = function (projectRoot) {
    var packageJson;
    try { packageJson = require(path.resolve(projectRoot, 'package.json')); } catch (e) { /* do nothing */ }

    var packageLockJson;
    try { packageLockJson = require(path.resolve(projectRoot, 'package-lock.json')); } catch (e) { /* do nothing */ }

    if (!packageJson) {
        console.error('Error: package.json is not available or it is invalid');
        process.exit(1);
    }
    if (!packageLockJson) {
        console.error('Error: package-lock.json is not available or it is invalid');
        process.exit(1);
    }

    var flagLockedVersionsInSync =
            lockedVersionsSatisfy(packageJson.dependencies, packageLockJson.dependencies) &&
            lockedVersionsSatisfy(packageJson.devDependencies, packageLockJson.dependencies);

    return flagLockedVersionsInSync;
};

var humanReadableByteSize = function (sizeInB) {
    if (typeof sizeInB === 'number' && !isNaN(sizeInB) && sizeInB >= 0 && sizeInB <= Number.MAX_SAFE_INTEGER) {
        var size = parseInt(sizeInB, 10);
        if (size === 1) {
            return size + ' byte';
        }
        if (size < 1024) {
            return size + ' bytes';
        }

        var arrUnits = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i;
        for (i = 0; i < arrUnits.length; i++) {
            size = size / 1024;
            if (size < 1024) {
                return parseInt(size, 10) + ' ' + arrUnits[i];
            }
        }
        return parseInt(size, 10) + ' ' + arrUnits[i - 1];
    } else {
        return sizeInB + ' bytes';
    }
};

var getFreeDiskSpaceOfPartitionForPath = async function (itemPath) {
    // https://stackoverflow.com/questions/19703621/get-free-disk-space-with-df-to-just-display-free-space-in-kb/19703644#19703644
    var output = await exec('sh', ['-c', 'df -B1 "' + itemPath + '" | tail -1 | tr -s " " | cut -d" " -f4']),
        textOutput = (output.stdout || '').trim(),
        exitCode = (output.err || {}).code || 0;
    if (exitCode) {
        console.log('Exit code: ' + exitCode);
    }
    if (output.err) {
        return null;
    }

    var sizeInBytes = parseInt(textOutput, 10);
    return sizeInBytes;
};

var getSizeOfItemAtGivenPath = async function (itemPath) {
    // https://askubuntu.com/questions/104848/how-can-i-see-a-folders-exact-size-in-bytes/104850#104850
    var output = await exec('sh', ['-c', 'du -s -B1 "' + itemPath + '"']),
        textOutput = (output.stdout || '').trim(),
        exitCode = (output.err || {}).code || 0;
    if (exitCode) {
        console.log('Exit code: ' + exitCode);
    }
    if (output.err) {
        return null;
    }

    var sizeInBytes = parseInt(textOutput, 10);
    return sizeInBytes;
};

var exitWithError = function (msg) {
    if (msg) {
        console.log(msg);
    }
    console.log('\n ✗ Failure\n');
    process.exit(1);
};

var showWarningMessage = function (msg) {
    console.warn('');
    console.warn('    ' + '*'.repeat(msg.length + 4));
    console.warn('    *' + ' '.repeat(msg.length + 2) + '*');
    console.warn('    ' + '* ' + msg + ' *');
    console.warn('    *' + ' '.repeat(msg.length + 2) + '*');
    console.warn('    ' + '*'.repeat(msg.length + 4));
};

var npmInstallQuick = async function (options) {
    var {
        argv = process.argv,
        projectRoot = process.cwd(),
        archiveDirectory = '/var/tmp/npm-install-quick/archive',
        showDiskSpaceWarningBelow = 10 * 1024 * 1024 * 1024         // 10 GB, by default
    } = options;
    argv = argv || [];
    var passedArguments = {};

    argv.forEach(function (val, index) {
        if (index >= 2) {
            passedArguments[val] = val;
        }
    });

    var spawnWrtProjectRoot = async function (app, params, options = {}) {
        var cwd = projectRoot,
            exitCode = await spawn(app, params, { cwd });
        if (exitCode) {
            console.log('Exit code: ' + exitCode);
            if (options.bailOnError) {
                exitWithError('Error: The last command did not execute successfully');
            }
        }
        return exitCode;
    };

    var backupNodeModulesIfRequired = async function (nodeModulesBackupFilePath) {
        if (!fs.existsSync(nodeModulesBackupFilePath)) {
            var directoryPath = path.dirname(nodeModulesBackupFilePath);
            var exitCode;
            exitCode = await spawnWrtProjectRoot('sh', ['-c', 'mkdir -p ' + directoryPath]);
            if (exitCode) {
                return exitCode;
            } else {
                // https://stackoverflow.com/questions/38273253/using-two-commands-using-pipe-with-spawn/38273497#38273497
                exitCode = await spawnWrtProjectRoot('sh', ['-c', 'tar cf - node_modules | gzip -6 - > ' + nodeModulesBackupFilePath]);
                if (exitCode) {
                    return exitCode;
                }
            }
        }
        return 0;
    };

    var restoreNodeModulesFromBackup = async function (nodeModulesBackupFilePath, archiveDirectory) {
        var directoryName = path.basename(nodeModulesBackupFilePath).split('.tar.gz')[0],
            directoryPathWrtProjectRoot = path.resolve(archiveDirectory, directoryName);

        await spawnWrtProjectRoot('sh', ['-c', 'mkdir -p "' + directoryPathWrtProjectRoot + '"'], { bailOnError: true });
        await spawnWrtProjectRoot('sh', ['-c', 'tar -xzf "' + nodeModulesBackupFilePath + '" --directory "' + directoryPathWrtProjectRoot + '"'], { bailOnError: true });

        // TODO: Rather than removing node_modules, rename that directory to some temporary name
        //       and once the next step of moving the restored node_modules is done, then
        //       remove the directory
        await spawnWrtProjectRoot('sh', ['-c', 'rm -rf node_modules'], { bailOnError: true });
        await spawnWrtProjectRoot('sh', ['-c', 'mv "' + directoryPathWrtProjectRoot + '/node_modules" ./'], { bailOnError: true });

        await spawnWrtProjectRoot('sh', ['-c', 'rm -rf "' + directoryPathWrtProjectRoot + '"'], { bailOnError: true });
    };

    var fileExistsRelativeToProjectRoot = function (file) {
        var resolvedPath = path.resolve(projectRoot, file);
        return fs.existsSync(resolvedPath);
    };

    var getNodeModulesBackupFilePath = async function (options) {
        var { projectRoot, projectName, archiveDirectory } = options;
        projectName = projectName.replace(/\//g, '-');  // Some packages have names like: @user/package-name ; We replace "/" with "-" to ensure that subfolders don't get created by mistake
        var stakeholdersHash = await generateStakeholdersHash({projectRoot}),
            nodeModulesBackupFilePath = path.resolve(projectRoot, archiveDirectory, projectName + '-node_modules-' + stakeholdersHash + '.tar.gz');
        return nodeModulesBackupFilePath;
    };

    var projectName = (function (projectRoot) {
        var packageJson;
        try { packageJson = require(path.resolve(projectRoot, 'package.json')); } catch (e) { /* do nothing */ }
        var projectName = (packageJson || {}).name || '';
        return projectName;
    }(projectRoot));

    if (!fileExistsRelativeToProjectRoot('package.json')) {
        exitWithError('Error: ' + path.resolve(projectRoot, 'package.json') + ' does not exist');
    }

    var nodeModulesBackupFilePath = await getNodeModulesBackupFilePath({projectRoot, projectName, archiveDirectory});
    var warningOccurred = false;

    if (fs.existsSync(path.dirname(nodeModulesBackupFilePath))) {
        var sizeOccupiedByArchiveDirectory = await getSizeOfItemAtGivenPath(path.dirname(nodeModulesBackupFilePath));
        if (sizeOccupiedByArchiveDirectory === null) {
            warningOccurred = true;
            showWarningMessage('Warning: The size occupied by the node_modules archive directory is NOT AVAILABLE');
        } else {
            console.log('Info: The size occupied by the node_modules archive directory is ' + humanReadableByteSize(sizeOccupiedByArchiveDirectory));
        }

        var freePartitionSpaceInBytes = await getFreeDiskSpaceOfPartitionForPath(path.dirname(nodeModulesBackupFilePath));
        if (freePartitionSpaceInBytes === null) {
            showWarningMessage('Warning: Could not get information about the free disk space for the partition where node_modules archive is expected to be backed up');
            warningOccurred = true;
        } else {
            if (freePartitionSpaceInBytes < showDiskSpaceWarningBelow) {
                showWarningMessage('Warning: The available disk space for the partition containing node_modules archive directory is ' + humanReadableByteSize(freePartitionSpaceInBytes));
                warningOccurred = true;
            } else {
                console.log('Info: The available disk space for the partition containing node_modules archive directory is ' + humanReadableByteSize(freePartitionSpaceInBytes));
            }
        }
    }

    if (fileExistsRelativeToProjectRoot('package-lock.json')) {
        if (!arePackageJsonAndPackageLockJsonInSync(projectRoot)) {
            if (passedArguments['--package-lock-must-be-in-sync-when-available']) {
                exitWithError('Error: package-lock.json file is not in sync with package.json');
            }
            warningOccurred = true;
            showWarningMessage('Warning: Your package-lock.json is out of sync with package.json');
        }
    } else {
        if (passedArguments['--must-have-package-lock']) {
            exitWithError('Error: package-lock.json file is missing');
        }
    }

    if (fs.existsSync(nodeModulesBackupFilePath)) {
        await restoreNodeModulesFromBackup(nodeModulesBackupFilePath, archiveDirectory);
    } else {
        let exitCode;
        if (fileExistsRelativeToProjectRoot('package-lock.json')) {
            if (arePackageJsonAndPackageLockJsonInSync(projectRoot)) {
                exitCode = await spawnWrtProjectRoot('npm', ['ci']);
                if (exitCode !== 0) {
                    warningOccurred = true;
                    showWarningMessage('Warning: "$ npm ci" command failed');

                    exitCode = await spawnWrtProjectRoot('npm', ['install', '--no-package-lock']);
                    if (exitCode !== 0) {
                        warningOccurred = true;
                        showWarningMessage('Warning: "$ npm install --no-package-lock" command failed');

                        exitCode = await spawnWrtProjectRoot('npm', ['install']);
                        if (exitCode !== 0) {
                            warningOccurred = true;
                            showWarningMessage('Warning: "$ npm install" command failed');
                        }
                    }
                }
            } else {
                exitCode = await spawnWrtProjectRoot('npm', ['install']);
                if (exitCode === 0) {
                    // Update nodeModulesBackupFilePath since the "stakeholder" package-lock.json might have changed have changed
                    nodeModulesBackupFilePath = await getNodeModulesBackupFilePath({projectRoot, projectName, archiveDirectory});
                } else {
                    warningOccurred = true;
                    showWarningMessage('Warning: "$ npm install" command failed');

                    exitCode = await spawnWrtProjectRoot('npm', ['install', '--no-package-lock']);
                    if (exitCode !== 0) {
                        warningOccurred = true;
                        showWarningMessage('Warning: "$ npm install --no-package-lock" command failed');
                    }
                }
            }
        } else {
            exitCode = await spawnWrtProjectRoot('npm', ['install', '--no-package-lock']);
            if (exitCode !== 0) {
                warningOccurred = true;
                showWarningMessage('Warning: "$ npm install --no-package-lock" command failed');
            }
        }

        if (exitCode === 0) {
            exitCode = await backupNodeModulesIfRequired(nodeModulesBackupFilePath);
            if (exitCode) {
                warningOccurred = true;
                showWarningMessage('Warning: Could not backup the node_modules contents');
            }
        } else {
            exitWithError('Error: Could not run npm installation');
        }
    }

    console.log('');
    if (warningOccurred) {
        console.log(' ? Please note the warning(s) mentioned above');
    }
    console.log(' ✓ Success\n');
};

if (!module.parent) {
    npmInstallQuick({
        argv: process.argv,
        projectRoot: (function () {
            var nodeParents = require('./utils/3rdparty/node-parents/node-parents.js');

            var cwd = process.cwd(),
                pathsToLookForPackageJson = nodeParents(cwd);

            var packageJsonFoundAtPath = pathsToLookForPackageJson.find(function (pathToLookForPackageJson) {
                if (fs.existsSync(path.resolve(pathToLookForPackageJson, 'package.json'))) {
                    return true;
                }
            });
            if (packageJsonFoundAtPath) {
                return packageJsonFoundAtPath;
            } else {
                return cwd;
            }
        }()),
        // projectRoot: path.resolve(__dirname, '..'),
        archiveDirectory: '/var/tmp/npm-install-quick/archive',     // Use such a path to keep the archived node_modules contents in a shared temporary folder
        // archiveDirectory: 'node_modules-archive/archive',        // Use such a path to keep the archived node_modules contents within the project directory
        showDiskSpaceWarningBelow: 10 * 1024 * 1024 * 1024          // Warn if free disk space for the partition containing "archiveDirectory" is less than 10 GB
    });

}

module.exports = npmInstallQuick;
