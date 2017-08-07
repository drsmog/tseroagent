const Promise = require("bluebird");
const clone = Promise.promisify(require('git-clone'));
const rimraf = Promise.promisify(require('rimraf'));
const exec = Promise.promisify(require('child_process').exec);
const fs = require('fs');
const archiver = require('archiver');
const DecompressZip = require('decompress-zip');
const chalk = require('chalk');


let configstring = fs.readFileSync('tseroconf.json', {
  encoding: 'utf-8'
});

let curretnConfig = JSON.parse(configstring);


function deleteDirectory(targetPath) {
  console.log(chalk.yellow('Deleting Working Directory ...'));

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
  console.log(chalk.yellow('Clonning Repository ... '));
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

function archiveFiles(workingPath, outputPath) {

  console.log(chalk.yellow('Archiving Artifact Files ... '));

  return new Promise(function (resolve, reject) {

    var output = fs.createWriteStream(outputPath);
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
      ignore: ['file1', 'file2', 'file3']
    }, {});


    // finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();
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
      //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.extract({
      path: unzipDest,
      filter: function (file) {
        return file.type !== "SymbolicLink";
      }
    });
  });

}

function runCommandsFromConfig(commands) {
  let p = Promise.resolve();

  commands.forEach(function (item) {

    item.cmds.forEach(function (command) {
      p = p.then(function () {
        console.log(chalk.yellow(command, item.cwd));
        return run(command, item.cwd)
      });
    })
  });

  return p;
}

let p = Promise.resolve()
  .then(deleteDirectory.bind(this, curretnConfig.cloneDest))
  .then(function () {
    return cloneRepository(curretnConfig.repoUri, curretnConfig.cloneDest);
  })
  .then(runCommandsFromConfig.bind(this, curretnConfig.commands))
  .then(function () {
    return archiveFiles(curretnConfig.cloneDest, curretnConfig.artifactFullFileName);
  })
  .then(function () {

    return unzipArtifact(curretnConfig.artifactFullFileName, curretnConfig.artifactUnzipDest);
  });

