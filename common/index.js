const fs = require("fs"),
  csv = require("csvtojson"),
  xlsxtojson = require("xlsx-to-json-lc"), //excel file
  xlstojson = require("xls-to-json-lc"), //excel file
  xml2js = require("xml2js"), // xml file
  jsonxml = require("jsontoxml"),
  Excel=require('exceljs');
  path = require('path');
(_ = require("lodash")), (parser = new xml2js.Parser());
var kue = require("kue"),
  FtpClient = require("ftp");
let seamless = async function (item, file, cb) {
  /*
       item = {
           brand,
           file,
           optId
       }
  
      */
  var that = this;
  var upload_type = this.upload_type;
  cb = cb || function () {};
  var currentRemote = this.localFile,
    prevFilePath = this.prevFile;

  var getPrevFileExt = prevFilePath.split(".");
  getPrevFileExt = getPrevFileExt[getPrevFileExt.length - 1];
  var getCurrentFileExt = currentRemote.split(".");
  getCurrentFileExt = getCurrentFileExt[getCurrentFileExt.length - 1];

  if (!fs.existsSync(prevFilePath)) {
    this.job.log("-- Prev File not exist to compare----");
    var currentdata = await getJSON.call(this,currentRemote,this.item.brand)
    this.noOfRecords = currentdata? currentdata.length: 0;
    return cb(true);
  } else if (getPrevFileExt != getCurrentFileExt) {
    this.job.log(
      "--Prev File Extension is not match with Current File Extension"
    );
    return cb(true);
  }

  try {
    var prevFileData = await getJSON.call(this, prevFilePath, this.item.brand);
    var currentFileData = await getJSON.call(this,currentRemote,this.item.brand);
    // used or condition because if this is first time then there is no prev file is avaliable
    // console.log("prevfile",prevFileData);
    // console.log("curfile",currentFileData);

    if (getPrevFileExt == "csv" || getCurrentFileExt == "csv") {
      var diffItems = [];
      let columnHeaders = currentFileData[0];
      currentFileData.shift();
      currentFileData.forEach(function (line, index) {

        // line = line.replace(',~','').trim();
        if (prevFileData.indexOf(line) < 0) {
          //  diffItems.push(line + ",Yes,~");
          diffItems.push(line+'');
        } else if (upload_type == "full") {
          // diffItems.push(line + ",No,~");
          diffItems.push(line +"");
        }
      
      });
      if (diffItems.length) {
        that.noOfRecords = diffItems.length;
        var modifiedStream = fs.createWriteStream(that.modifiedRemote, {});
        // columnHeaders= columnHeaders.replace(',~','').trim();
        //  modifiedStream.write(columnHeaders + ",Processing,~\n");
        modifiedStream.write(columnHeaders + "\n");
        diffItems.forEach(function (item) {
          modifiedStream.write(item + "\n");
        });
        modifiedStream.end();
      
        return cb(true);
      } else {
        return cb(false);
      }
    } else if (getCurrentFileExt == "xlsx" || getPrevFileExt == "xlsx" || getCurrentFileExt == "xls" || getPrevFileExt == "xls") {
      let diffItems = [];
      currentFileData.forEach(function (obj, index) {
        var compareData = _.find(prevFileData, obj);
        // compareData is undefined means data is not present in previous file
        if (compareData == undefined) {
          obj.Processing = "Yes";
          diffItems.push(obj);
        } else if (upload_type == "full") {
          obj.Processing = "No";
          diffItems.push.push(obj);
        }
      }); // each complete

      if (diffItems.length) {
        that.noOfRecords = diffItems.length;
        createXlsx(diffItems, that.modifiedRemote, (err) => {
          if (err) {
            that.job.log(err)
            return cb(false)
          }
          return cb(true);
        });
      } else {
        return cb(false);
      }
    } else if (getCurrentFileExt == "xml" || getPrevFileExt == "xml") {
      console.log("In 101 line");
      let diffItems = [];
      currentFileData.forEach(function (obj, index) {
        var compareData = _.find(prevFileData, obj);
        console.log("compare data ", compareData);
        // compareData is undefined means data is not present in previous file
        if (compareData == undefined) {
          obj.Processing = ["Yes"];
          diffItems.push(obj);
        } else {
          //if (upload_type == 'full')
          obj.Processing = ["No"];
          diffItems.push(obj);
        }
      }); // each complete

      if (diffItems.length) {
        that.noOfRecords = diffItems.length;
        createXML(diffItems, that.modifiedRemote, that.item.brand.xml, () => {
          return cb(true);
        });
      } else {
        return cb(false);
      }
    } else {
      console.log("Invalid type ");
      return cb(false);
    }
  } catch (e) {
    console.log("Exception", e);
    return cb(false);
  }
};

function getter() {
  var v = this.result;
  for (var i = 0; i < arguments.length; i++) {
    if (!v) return null;
    v = v[arguments[i]];
  }
  return v;
}
let csvToJSON = function (filePath, cb) {
  console.log("csvToJSON", filePath);
  return new Promise(function (resolve, reject) {
    console.log("callling csvtojson");
    // Do async job
    var array = [];
    csv()
      .fromFile(filePath)
      .on("json", jsonRow => {
        console.log("jsonrow", jsonRow);
        array.push(jsonRow);
      })
      .on("done", error => {
        if (error) {
          reject(error);
        } else {
          resolve(array);
        }
      });
  });
};

function getJSON(filePath, brand, cb) {
  console.log("filePath", filePath);
  var getExt = filePath.split(".");
  getExt = getExt[getExt.length - 1];
  var that = this;
  return new Promise(function (resolve, reject) {
    if (getExt == "csv") {
      var lineReader = require("readline").createInterface({
        input: require("fs").createReadStream(filePath)
      });
      var array = [];
      lineReader.on("line", function (line) {
        array.push(line);
      });
      lineReader.on("close", function () {
        resolve(array);
      });
    } else if (getExt == "xlsx") {
      // read xlsx file and convert it to json format
      xlsxtojson({
          input: filePath,
          output: null,
          sheet:  'Sheet 1'
        },
        function (err, result) {
          if (err) {
            console.error(err);
            return reject(err);
          } else {
            resolve(result);
          }
        }
      );
    } else
    if (getExt == 'xls') {
      console.log("in xls ");
      console.log(filePath);
      xlstojson({
          input: filePath,
          output: null
        },
        function (err, result) {
          if (err) {
            console.log("208")
            console.error(err);
            return reject(err);
          } else {
            console.log("212")
            console.log(result);
            resolve(result);
          }
        }
      );
    } else if (getExt == "xml") {
      fs.readFile(filePath, function (err, data) {
        parser.parseString(data, function (err, result) {
          if (err) return reject(err);
          if (brand.xml && brand.xml.parentTag) {
            var parent_tags = brand.xml.parentTag.split(".");
            return resolve(getter.apply({
              result: result
            }, parent_tags));
          }
        });
      });
    } else {
      // invalid file
      console.log("Invalid file " + filePath);
      that.job.error("File format not supported");
    }
  });
}
let moveFile = function (ftpobj, src, dest, cb) {
  cb = cb || function () {};
  var c = new FtpClient();
  c.on("ready", function () {
    c.rename(src, dest, function (err) {
      if (err) cb(err);
      c.end();
      cb();
    });
  });
  c.connect(ftpobj);
  c.on("error", function (err) {
    cb(err);
  });
};
let uploadFile = function (ftpobj, localFile, remotePath, cb) {
  cb = cb || function () {};
  var c = new FtpClient();
  c.on("ready", function () {
    c.put(localFile, remotePath, function (err) {
      if (err) cb(err);
      c.end();
      cb();
    });
  });
  // connect to localhost:21 as anonymous
  c.connect(ftpobj);
  c.on("error", function (err) {
    cb(err);
  });
};
var getUploadType = function (name) {
  if (name && name.toLowerCase().indexOf("full") > -1) {
    return "full";
  }
  return "partial";
};
var createXlsx = (obj, file_name, callback) => {
  console.log("In create ");
  console.log(obj[0])
  var headers = Object.keys(obj[0]);
  var workbook = new Excel.Workbook();

  var headerArr = [];
  var headerBold = [];
  var char = 65; // for ascii value of A
  var sheet_name =  'Sheet 1'
  var summary = workbook.addWorksheet(sheet_name);

  headers.map(function (value) {
      headerArr.push({
      header: value,
      key: value
    });
    headerBold.push(String.fromCharCode(char) + 1);
    char += 1;
  });

  summary.columns = headerArr;

  // To set colume headers as BOLD.
  _.each(headerBold, item => {
    summary.getCell(item).font = {
      bold: true
    };
  });

  _.each(obj, item => {
    summary.addRow(item);
  });

  workbook.xlsx
    .writeFile(file_name)
    .then(() => {
      console.log("Done writing file");
      callback(err);
    })
    .catch(err => {
      console.log("Done writing file");
      callback();
    });
};
var createXML = (obj, file_name, brand_xml, callback) => {
  var parentTag = brand_xml.parentTag;
  var parent_tags = parentTag.split('.');
  // get json obj and convert it to xml type
  console.log("In createXML ");
  console.log(obj);

  obj = obj.map(function (row) {
    var xml_row = {
      name: parent_tags[1],
      children: row
    }
    return xml_row;
  })
  var jsonxmlobj = {
    [parent_tags[0]]: obj
  }
  fs.writeFile(file_name, jsonxml(jsonxmlobj), function (err) {
    if (err) console.log(err);
    else {
      callback(true);
    }
  });
};
let addBrandFileToQueue = function (queue,brand, file, priority, delay, cb) {


  if (delay == undefined || delay == null || delay == '') {
    delay = 0;
  }
  console.log("----Calling addBrandFileToQueue");

  var job = queue
    .create("catalogbatchqueue", {
      optId: brand.optId,
      brand,
      file,
      title: `Brand: ${brand.name} (${brand.optId})   File: ${file.name}`
    })
    .priority(priority)
    .delay(delay)
    .searchKeys(["optId"])
    .save(function (err) {
      // {2:[1,2,3,4,5]}
      if (!err) console.log("jobid", job.data.brand.name);
      if (err) console.log("err", err);
      cb();
    });

  job
    .on("complete", function (id, result) {
      console.log("uploaderqueue Job completed with data ", result);
      kue.Job.get(id, function (err, job) {
        if (err) return;
        job.remove(function (err) {
          if (err) throw err;
          console.log("removed completed job #%d", job.id);
        });
      });
    })
    .on("failed attempt", function (errorMessage, doneAttempts) {
      console.log("Job failed attempt");
    })
    .on("failed", function (errorMessage) {
      console.log("line number 337");
      console.log(errorMessage);
      console.log("Job failed", errorMessage);

    })
    .on("progress", function (progress, data) {
      console.log(
        "\r  job #" + job.id + " " + progress + "% complete with data ",
        data
      );
    });

}


module.exports = {
  addBrandFileToQueue,
  seamless,
  csvToJSON,
  moveFile,
  uploadFile,
  getUploadType
};