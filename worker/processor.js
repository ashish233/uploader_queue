let Uploader = require("./uploader"),
  kue = require("kue"),
  common = require("../common/index");
let moveFileToErrorDir = function(item) {
  console.log("----Moving file from processing to error ---", item.file);
};

const sendErrorEmail = function(queue,item, err) {
  console.log("Calling sendErrorEmail");
  var emailjob = queue
    .create("email", { item: item, err: err,title:err})
    .attempts(2)
    .save(function(err) {
      if (!err) console.log("emailjobid", emailjob.id);
      if (err) console.log("email queueerr", err);
    });
  emailjob
    .on("complete", function(id, result) {
      console.log(" mangerjob Job completed with data ", result);
      kue.Job.get(id, function(err, job) {
        if (err) return
        job.remove(function(err) {
          if (err) throw err;
          console.log("removed completed mangerjob #%d", emailjob.id);
        });
      });
    })
    .on("failed attempt", function(errorMessage, doneAttempts) {
      console.log("mangerjob failed attempt");
    })
    .on("failed", function(errorMessage) {
      console.log("mangerjob failed", errorMessage);
    })
    .on("progress", function(progress, data) {
      console.log(
        "\r  job #" + emailjob.id + " " + progress + "% complete with data ",
        data
      );
    });
};
module.exports = function(queue,cbuploader,config,globalPath,numberOfProcess) {
  console.log(globalPath);
  var brandHash ={};
  queue.process("catalogbatchqueue", numberOfProcess, function(job, ctx, done) {
    job.log("-----process----");
    let item = job.data;
    if (item != undefined && brandHash[job.data.optId] == undefined) {
      brandHash[job.data.optId] = 1;
      let uploader = new Uploader(item, job,config,globalPath);
      uploader.cbuploader = cbuploader
      uploader.on("error", function(err) {
        console.log("++++error++++++");
        console.log(err);
        delete brandHash[job.data.optId];
        moveFileToErrorDir(uploader.item);
        sendErrorEmail(queue,uploader.item, err.message);
        done(err);
      });
      uploader.on("done", function(message) {
        job.progress(90, 100);
        console.log("done", message);
        delete brandHash[job.data.optId];
        // moveFileToProcessedDir(message);
        done(null, item);
      });
      uploader.start();
    } else {
      var delay = (60*5) * 1000;
      console.log("in line number 39");
      console.log(job.id);
      console.log(job.data.brand.name);
      job.log(job.data.file.name, " file will process in next iteration...");
      
      common.addBrandFileToQueue(
        job.data.brand,
        job.data.file,
        job.data.brand.priority,
        delay,
        function(cb) {
          done(null, item);
          // cb();
        }
      );
    }
  });
};
