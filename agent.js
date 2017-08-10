const Promise = require("bluebird");
const clone = Promise.promisify(require('git-clone'));
const rimraf = Promise.promisify(require('rimraf'));
const exec = Promise.promisify(require('child_process').exec);
const fs = require('fs');
const archiver = require('archiver');
const DecompressZip = require('decompress-zip');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const path = require('path');

const INTERNAL_COMMAND_SIGNATURE = '$tsero';
const COMMAND_UNZIP = 'unzip';
const COMMAND_DELDIR = 'deldir';
const COMMAND_ZIP = 'zip';
const COMMAND_GITCLON = 'gitclone';


let configstring = fs.readFileSync('tseroconf.json', {
  encoding: 'utf-8'
});

let curretnConfig = JSON.parse(configstring);


function deleteDirectory(targetPath) {
  console.log(chalk.yellow(`Deleting Directory ${targetPath} ...`));

  return rimraf(targetPath)
    .then(function () {
      console.log(chalk.green('Done'));
      return;
    })
    .catch(function (err) {
      console.log(chalk.red(err));
      return;
    });
}

function cloneRepository(repoUri, cloneDest) {
  console.log(chalk.yellow('Cloning Repository ... '));
  return clone(repoUri, cloneDest)
    .then(function () {
      console.log(chalk.green('Done'));
      return;
    })
    .catch(function (err) {
      console.log(chalk.red(err));
      return;
    })



}

function run(cmd, cwd) {
  return exec(cmd, {
      cwd: cwd
    })
    .then(function (stdout, stderr) {
      if (stderr) {
        console.log('' + chalk.red(stderr));
      }
      if (stdout) {
        console.log('' + chalk.green(stdout));
      }
      return;
    })
    .catch(function (err) {
      if (err) {
        console.log('' + chalk.red(err));
        return;
      }
    })


};

function archiveFiles(workingPath, outartifact, ignoreFile) {

  console.log(chalk.yellow('Archiving Artifact Files ... '));

  return new Promise(function (resolve, reject) {

    let ignoreArray = JSON.parse(fs.readFileSync(ignoreFile, {
      encoding: 'utf-8'
    }));


    mkdirp.sync(path.dirname(outartifact));

    var output = fs.createWriteStream(outartifact);
    var archive = archiver('zip', {
      zlib: {
        level: 9
      } // Sets the compression level.
    });

    // listen for all archive data to be written
    output.on('close', function () {
      console.log(chalk.green(archive.pointer() + ' total bytes'));
      console.log(chalk.green('archiver has been finalized and the output file descriptor has closed.'));
      resolve();
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function (err) {
      reject(err.code);
    });

    // good practice to catch this error explicitly
    archive.on('error', function (err) {
      reject(err);
    });

    // pipe archive data to the file
    archive.pipe(output);

    archive.glob(`**`, {
      cwd: `${workingPath}`,
      ignore: ignoreArray
    }, {});


    // finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();
  }).catch(function (err) {
    console.log(err);
  });

}

function unzipArtifact(targetPath, unzipDest) {

  console.log(chalk.yellow('Extracting Artifact Files From Archive ... '));

  return new Promise(function (resolve, reject) {
    var unzipper = new DecompressZip(targetPath)

    unzipper.on('error', function (err) {
      reject(err);
    });

    unzipper.on('extract', function (log) {
      console.log(chalk.green('Finished extracting'));
      resolve(log);
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
      console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.extract({
      path: unzipDest,
      filter: function (file) {
        return file.type !== "SymbolicLink";
      }
    });
  }).catch(function (err) {
    console.log(err);
  });

}

function runCommandsFromConfig(commands) {
  let p = Promise.resolve();

  commands.forEach(function (item) {

    item.cmds.forEach(function (command) {
      p = p.then(function () {
        if (isInternalCommand(command)) {
          console.log(chalk.blue(command, item.cwd));
          return internalCommandHandler(command)
        }
        console.log(chalk.yellow(command, item.cwd));
        return run(command, item.cwd)
      });
    })
  });

  return p;

  function isInternalCommand(command) {
    let c = command.split(' ');
    if (c[0].trim() === INTERNAL_COMMAND_SIGNATURE) return true;
  }

}

function internalCommandHandler(command) {

  return new Promise(function (resolve, reject) {

    let c = command.split(' ');

    if (c < 2) {
      console.log(chalk.red('Invalid Internal Command ', command));
      reject('Invalid Internal Command');
    }

    let internalCommand = c[1];

    switch (internalCommand) {
      case COMMAND_UNZIP:
        return resolve(unzipArtifact(c[2], c[3]));
      case COMMAND_ZIP:
        return resolve(archiveFiles(c[2], c[3], c[4]));
      case COMMAND_DELDIR:
        return resolve(deleteDirectory(c[2]));
      case COMMAND_GITCLON:
        return resolve(cloneRepository(c[2], c[3]))

      default:
        return resolve();
    }
  })


}

runCommandsFromConfig(curretnConfig.commands);

