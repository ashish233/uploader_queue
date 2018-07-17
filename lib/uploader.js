'use strict'

var queue = require('../initializers/queue');
var config = require('../config/default');
var kue = require('kue');

var brands = config.brands;
var fileFormats = config.supportedFileFormat;



var uploader = function ({ queue, brands, fileFormats, cbuploader, config, filePath }) {
    // console.log(config);
    // console.log(filePath)
    var manager = require("../worker/manager");
    manager(queue, brands, fileFormats);

    //inialize processor
    var processor = require("../worker/processor");
    processor(queue, cbuploader, config, filePath);

    var email = require("../worker/email");
    email(queue, config);

};


// kue.app.listen(3001);
// console.log(`Queue Management Server running on ${3001}`)
// process.on('unhandledRejection', function (err) {
//     console.log(err)
// })

// var filePath = "/Users/SQR-Mallinath/Documents/project/showcase/node_modules/opt-lib";

// uploader({
//     queue, brands, fileFormats, cbuploader: function (params, cb) {

//         if (!this.job) {
//             this.job = {
//                 log: function () {

//                 }
//             }
//         }
//         this.job.log('In Custom cb uploader')
//         setTimeout(() => {
//             cb()
//         }, 1000)

//     }, config,filePath:"/Users/SQR-Mallinath/Documents/project/showcase/node_modules/opt-lib"
// });
module.exports = uploader;
