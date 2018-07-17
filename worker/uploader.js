let events = require("events"),
  FtpClient = require("ftp"),
  fs = require("fs"),
  common = require("../common"),
  path = require("path"),
  async_lib = require("async"),
  axios = require("axios"),
  _ = require('underscore');

class Uploader extends events {
  constructor(item, job, config, globalPath) {
    super();
    this.producterrors = [];
    this.config = config;
    this.item = item;
    this.job = job;
    this.isRunning = false;
    this.globalPath = globalPath;

    this.upload_type = common.getUploadType(this.item.file.name);
    this.job.log('--UPLOAD TYPE--', this.upload_type)
    this.ftpclient = new FtpClient();
  }
  start() {
    var that = this;
    this.job.log("--------Start-----------");
    this.ftpclient.connect(this.item.brand.ftp);
    this.ftpclient.on("error", function (err) {
      that.emit("error", err);
    });
    // that.emit("error", { message: "Custom Error" });
    this.moveFileToProcessingDir();
  }
  moveFileToProcessingDir() {
    console.log(this.item);
    this.job.log("--------moveFileToProcessingDir-----------");
    var brand = this.item.brand,
      file = this.item.file,
      that = this;
    this.job.progress(10, 100);
    this.ftpclient.rename(
      brand.dir.enqueued + file.name,
      brand.dir.processing + file.name,
      function (err) {
        // that.ftpclient.end();
        if (err) {
          that.job.log(
            "Ftp Error: moving file from " +
            brand.dir.enqueued +
            file.name +
            " to" +
            brand.dir.processing +
            file.name
          );
          that.emit("error", err);
          return;
        }
        that.downloadFileFromFtp();
      }
    );
    // this.downloadFileFromFtp();
  }
  downloadFileFromFtp() {
    if (!fs.existsSync(this.globalPath + "/temp/")) {
      fs.mkdirSync(this.globalPath + "/temp/");
    }
    this.job.log("------- downloadFileFromFtp ------- ");
    this.job.progress(30, 100);
    let that = this;
    let brandTempDir =
      this.globalPath + "/temp/" + this.item.brand.optId + "/";
    if (!fs.existsSync(brandTempDir)) {
      fs.mkdirSync(brandTempDir);
    }
    if (!fs.existsSync(path.join(this.globalPath, "prev"))) {
      fs.mkdirSync(path.join(this.globalPath, "prev"));
    }
    this.job.log("brandTempdir", brandTempDir);
    this.tempFile = brandTempDir + that.item.file.name;
    this.job.log(
      "localfile",
      this.globalPath +
      "/temp/" +
      this.item.brand.optId +
      "/" +
      that.item.file.name
    );
    this.localFile =
      this.globalPath +
      "/temp/" +
      this.item.brand.optId +
      "/" +
      that.item.file.name;
    this.ftpclient.get(
      this.item.brand.dir.processing + this.item.file.name,
      function (err, stream) {
        // that.ftpclient.end();
        console.log("error", err);
        if (err) return that.emit("error", err);
        stream.once("close", function () {
          that.ftpclient.end();
          that.seamless();
        });
        stream.pipe(fs.createWriteStream(brandTempDir + that.item.file.name));
      }
    );
  }
  seamless() {
    this.job.progress(40, 100);
    this.job.log("----- Seamless ------", this.pid);
    let that = this;
    var i = 40;

    var getFileExt = that.item.file.name.split(".");
    getFileExt = getFileExt[getFileExt.length - 1];

    this.prevFile = path.join(
      this.globalPath,
      "prev",
      that.item.optId,
      "prevfile." + getFileExt
    );
    this.currentRemote = this.localFile;
    this.modifiedRemote = path.join(
      this.globalPath,
      "temp",
      that.item.optId +
      "mod-" +
      that.item.brand.optId +
      "-" +
      that.item.file.name
    );
    console.log("prevfile", this.prevFile);
    if (!fs.existsSync(path.join(this.globalPath, "prev", that.item.optId))) {
      fs.mkdirSync(path.join(this.globalPath, "prev", that.item.optId));
    }
    common.seamless.call(
      this,
      this.item,
      this.localFile,
      function (isDifferentFile) {
        if (!isDifferentFile) {
          that.job.log("--Duplicate File found, moving to ignore dir");
          common.moveFile(
            that.item.brand.ftp,
            that.item.brand.dir.processing + that.item.file.name,
            that.item.brand.dir.ignore + that.item.file.name,
            function (err) {
              if (err) {
                return that.emit("error", err);
              }

              return that.emit("done", { brand: that.item.brand });
            }
          );
        } else {
          that.uploadSeamlessFile();
        }
      }.bind(this)
    );
  }
  uploadSeamlessFile() {
    this.job.progress(45, 100)
    var that = this;
    let seamlessfile = this.currentRemote;
    if (fs.existsSync(this.modifiedRemote)) {
      seamlessfile = this.modifiedRemote;
    }
    this.job.log(
      "UPLOADING SEAMLESS FILE TO " +
      that.item.brand.dir.processing +
      that.item.file.name
    );
    common.uploadFile(
      that.item.brand.ftp,
      seamlessfile,
      that.item.brand.dir.processing + that.item.file.name,
      function (err) {
        if (err)
          return that.emit("error", {
            file: that.item.brand.dir.processing + that.item.file.name,
            message:
              "Error in uploading seamless file to " +
              that.item.brand.dir.processing +
              that.item.file.name
          });
        if (that.cbuploader && typeof that.cbuploader == 'function') {
          return that.customuploader();
        }
        that.localUploader();
      }
    );
  }
  async uploader() {
    var that = this;
    this.job.log("Executing Catalog batch Script");
    // brand productsSpecification.xml

    var Client = require("ssh2").Client;

    var conn = new Client();
    conn
      .on("ready", function () {
        console.log("Client :: ready");
        conn.exec(
          `sh /Users/ashwini/Documents/projects/uploader/runnode.sh 10 ${
          that.item.file.name
          }`,
          function (err, stream) {
            if (err) throw err;
            stream
              .on("close", function () {
                console.log("Stream :: close");
                conn.end();
                that.emit("error", code);
              })
              .on("disconnect", function (code) {
                console.log("Stream :: disconnect");
                that.job.log(`Disconnect event`, code);
                that.emit("error", code);
              })
              .on("data", function (data) {
                console.log("STDOUT: " + data);
                that.job.log(data + "");
              })
              .stderr.on("data", function (data) {
                console.log("STDERR: " + data);
                that.job.log("STDERR: " + data);
              });
          }
        );
      })
      .connect(
        _.extend(this.config.ssh, {
          privateKey: require("fs").readFileSync(this.config.ssh.privateKeyPath)
        })
      );
  }
  async localUploader() {
    this.job.log("LOCAL UPLOADER");
    var that = this;
    that.error_no_skip = false;
    that.error_count = 0;

    var records = this.noOfRecords || 0;
    this.job.log('Recordlength', records)
    // 100/7320
    var incrementpercent = 55 / records;
    var progress = 45;
    const { spawn } = require("child_process");
    console.log(this.config);
    console.log(`sh ${this.config.shScript} ${this.item.brand.optId} '${this.item.file.name}'`)
    this.job.log(`sh ${this.config.shScript} ${this.item.brand.optId} '${this.item.file.name}'`)
    const sh = spawn('sh', [
      this.config.shScript,
      this.item.brand.optId,
      this.item.file.name
    ]);
    sh.stdout.on("data", data => {
      console.log(`stdout: ${data}`);
      var data = data + '';
      var isvalidlog = _.find(this.config.logKeywords, function (log) {
        return data.toLowerCase().indexOf(log) > -1;
      })
      console.log('stdout isvalidlog', isvalidlog)
      if (isvalidlog) {
        data = data.split('\n');
        data.forEach(function (log) {
          progress += incrementpercent
          that.job.progress(progress, 100)
          that.job.log(log);
        })
      }

    });
    sh.stderr.on("data", data => {
      console.log(`stderr: ${data}`);
      var data = data + '';
      var isvalidlog = _.find(this.config.errKeywords, function (log) {
        return (data.toLowerCase().indexOf(log) > -1);
      })
      console.log('stderr isvalidlog', isvalidlog)
      if (isvalidlog) {
        that.error_count += 1;
        that.error_no_skip = true;
      }
      if (that.error_count > 4) {
        that.error_count = 0;
        that.error_no_skip = false;
      }
      if (isvalidlog || that.error_no_skip) {
        data = data.split('\n');
        data.forEach(function (log) {
          that.job.log(log);
        })
      }

    });
    sh.on("close", code => {
      that.job.log("Shell script processing done" + code);
      that.done();
      console.log(`child process exited with code ${code}`);
    });
  }
  async customuploader() {
    let param = {
      fileName: this.item.file.name,
      filePath:this.item.file.name,
      uploadType: this.upload_type
    }
    this.cbuploader.call(this,param, (err) => {
      if (err) return this.emit("error", err);
      this.done()
    })
  }
  done() {
    this.job.log("Moving file from processing to processed");
    var that = this;

    if (fs.existsSync(this.modifiedRemote)) {
      fs.unlinkSync(this.modifiedRemote);
    }
    fs
      .createReadStream(that.currentRemote)
      .pipe(fs.createWriteStream(that.prevFile));
    common.moveFile(
      that.item.brand.ftp,
      that.item.brand.dir.processing + that.item.file.name,
      that.item.brand.dir.processed + that.item.file.name,
      function (err) {
        if (err) {
          // that.emit('error',)
        }
        that.moveToBackup();
      }
    );
  }
  moveToBackup() {
    var that = this;
    this.job.log("MOVING FILE TO BACKUP DIR");
    common.uploadFile(
      that.item.brand.ftp,
      this.localFile,
      that.item.brand.dir.backup + that.item.file.name,
      function (err) {
        fs.unlinkSync(that.localFile);
        if (err) return that.emit("error", err);

        that.emit("done", { file: that.item.file });
      }
    );
  }
}
module.exports = Uploader;
