/* eslint-env node */

var execCP = require('child_process').exec,
    spawnCP = require('child_process').spawn;

var exec = async function (cmd, args = [], options = {}) {
    return new Promise(function (resolve, reject) {     // eslint-disable-line no-unused-vars
        var cwd = options.cwd || process.cwd();
        options.cwd = cwd;

        var command = cmd + ' ' + args.map(function (arg) {
            return "'" + arg + "'";
        }).join(' ');
        console.log(
            (function () {
                return ('\n[' + cwd + ']');
            }()) +
            '\n$ ' + command,
        );

        execCP(command, options, (err, stdout, stderr) => {
            var output = {
                err,
                stdout,
                stderr
            };
            resolve(output);
        });
    });
};

var spawn = async function (cmd, args = [], options = {}) {
    return new Promise(function (resolve, reject) {     // eslint-disable-line no-unused-vars
        var cwd = options.cwd || process.cwd();
        options.cwd = cwd;

        var commandToPrint = cmd + ' ' + args.map(function (arg) {
            return "'" + arg + "'";
        }).join(' ');
        console.log(
            (function () {
                return ('\n[' + cwd + ']');
            }()) +
            '\n$ ' + commandToPrint
        );

        var childProcess = spawnCP(cmd, args, options);
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);

        childProcess.on('exit', function(exitCode) {
            if (resolve) {
                resolve(exitCode);
            }
        });
    });
};

module.exports = {
    spawn,
    exec
};
