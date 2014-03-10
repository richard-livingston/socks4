/**
 * Created with JetBrains WebStorm.
 * User: Richard
 * Date: 10/03/14
 * Time: 15:07
 * To change this template use File | Settings | File Templates.
 */


var Server = require('./lib/server'),
    Protocol = require('./lib/constants');


module.exports.server = Server;

module.exports.createServer = module.exports.createServer = function(){
    return new Server(arguments[0], arguments[1]);
};

module.exports.protocol = Protocol;