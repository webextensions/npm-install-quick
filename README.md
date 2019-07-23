# npm-install-quick
Script for quick npm installation (archive **node_modules** directory and reuse). Helpful when you work on multiple branches.

---

**Please note**  
This functionality has been tested only in Linux environment. In case it doesn't run properly for your OS/environment, kindly create a new issue.

---

## Installation and usage

There are two ways to install **npm-install-quick** :  
* globally (as an executable)
* manually (add it only to a specific project)

### Global installation and usage

```sh
$ npm install -g npm-install-quick
```

```sh
$ npm-install-quick

  OR

$ npmiq
```

### Manual setup and usage

* Access the source code from https://github.com/webextensions/npm-install-quick
* Copy the following files / directories into your project:
  * **npm-install-quick**
  * **node_modules-archive** (If you wish to use that folder for backup, which is specified in **npm-install-quick/npm-install-quick.js**)
  * **npmiq.sh** (If you wish to use that helper command)
* Run it via one of the following executable files:
  * `$ ./npm-install-quick/npm-install-quick.js`
  * `$ ./npmiq.sh`

## Pain point (which this project aims to help you with)
In a Node JS project, you need to jump between branches, which often leads to the need of running npm install again and again. It costs a good amount of time.

## Assumptions / Recommendations
* Use Node JS version 8 or newer
* Use npm version 5 or newer

## Solution
Rather than using `$ npm install` , use `$ npm-install-quick` as provided by this project.

## How it works
When you run `$ npm-install-quick` :
* It would first try to find if there is an archived backup for the expected **node_modules** contents stored in a configured directory (eg: **/var/tmp/npm-install-quick/archive**)
* If a backup is available, it would be restored into the project's **node_modules** directory and that's it (on SSD disks, it would usually take around 1 to 10 seconds for most of the projects)
* If a backup was not available, the script internally runs `$ npm ci` or `$ npm install` or `$ npm install --no-package-lock`
* Once the contents in **node_modules** directory are updated successfully, a compressed backup file would be created in the directory configured for archiving

## Parameters
* `--must-have-package-lock`  
  Ensures that **package-lock.json** exists
* `--package-lock-must-be-in-sync-when-available`  
  Ensures that **package.json** and **package-lock.json** are in sync (when available)
* `--ignore-node-nvmrc-mismatch`  
  If `.nvmrc` file exists (with simple number format), then, the current Node JS version in use must match it

## Important files and directories
### Code:
* **./npm-install-quick/lib/**  
  The files in this directory contain the core functionality code
* **./npm-install-quick/npm-install-quick.js**  
  This file contains a general purpose configuration and usage example
* **./npmiq.sh**  
  This file contains a general purpose usage example (calls **./npm-install-quick/npm-install-quick.js**)

### Backup directory:
* **/var/tmp/npm-install-quick/archive**  
  Use such a path in configuration to keep the archived **node_modules** contents in a shared temporary directory
* **./node_modules-archive/archive**  
  Use such a path in configuration to keep the archived **node_modules** contents within the project directory

## Notes
* Since this would occupy a little extra disk space for each new backup, which may reach to a significant amount over time, you are updated about the size occupied by this archive directory on every repeated install and a warning would be shown when your free disk space is less than a threshold (default threshold: 10GB).
* If this script is executed in VirtualBox like environments with dynamic size disk file, it might lead to unnecessary disk usage over time, so, it is not recommended for such a case. As a workaround on such environments, one would need to update some of the required paths which use partition via fixed size disk file or paths shared by host machine.

## Similar npm packages
* have-it @ https://github.com/bahmutov/have-it
* inst @ https://github.com/runk/node-inst
* npm-fast-install @ https://github.com/appcelerator/npm-fast-install
* strong-cached-install @ https://github.com/strongloop/strong-cached-install

## TODO
* Use console coloring/styling (eg: via **chalk**/**boxen**), when packages for that are available
* Check that the script works across various environments / operating systems
* When restoring, extract the **node_modules** contents to a temporary directory first and then only do `$ rm -rf node_modules`, followed by renaming that temporary directory to **node_modules**
* When archiving a backup, pipe it to a temporary file name and once that operation is complete, rename it to the target filename. This would avoid race condition if multiple executions of this script attempt to write to the same file at the same time.
* Add more configuration options for compressing the files. For exmaple: higher compression ratio to save disk space, or faster compression to save time, or possibly a combination of both (by running compression task in background)
* Add the **npm** version as a stakeholder for generating hash for the backup file
* Add some options to suggest cleaning or automatically cleaning old backups
* Add support for **yarn**
