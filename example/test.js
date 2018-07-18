

var queue = require('../initializers/queue');
var config = require('../config/default');
var kue = require('kue');

kue.app.listen(3001);
console.log(`Queue Management Server running on ${3001}`)
process.on('unhandledRejection', function (err) {
    console.log(err)
})

var filePath = "/Users/SQR-Mallinath/Documents/project/showcase/node_modules/opt-lib";

uploader({
    queue, brands,numberOfProcess:5, fileFormats, cbuploader: function (params, cb) {

        if (!this.job) {
            this.job = {
                log: function () {

                }
            }
        }
        this.job.log('In Custom cb uploader')
        setTimeout(() => {
            cb()
        }, 1000)

    }, config,filePath:"/Users/SQR-Mallinath/Documents/project/showcase/node_modules/opt-lib"
});