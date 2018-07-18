'use strict'

var queue = require('../initializers/queue');
var config = require('../config/default');
var kue = require('kue');

var brands = config.brands;
var fileFormats = config.supportedFileFormat;



var uploader = function ({ queue, brands,numberOfProcess, fileFormats, cbuploader, config, filePath }) {
    // console.log(config);
    // console.log(filePath)
    var manager = require("../worker/manager");
    manager(queue, brands, fileFormats,numberOfProcess);

    //inialize processor
    var processor = require("../worker/processor");
    processor(queue, cbuploader, config, filePath,numberOfProcess);

    var email = require("../worker/email");
    email(queue, config);

};


module.exports = uploader;
