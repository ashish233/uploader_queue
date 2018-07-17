var kue = require("kue");
var config = require('../config/default');

    queue ='';
    queue = kue.createQueue(config.redis);
module.exports = queue;