/* globals describe, it */

var npmInstallQuick = require('../npm-install-quick/lib/main.js');       // eslint-disable-line no-unused-vars

describe('package', function() {
    describe('npm-install-quick', function() {
        // If there would be an error in require, the code would not reach this point
        it('should load fine using require', function(done) {
            done();
        });
    });
});
