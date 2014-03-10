/**
 * Created with JetBrains WebStorm.
 * User: Richard
 * Date: 05/03/14
 * Time: 15:07
 * To change this template use File | Settings | File Templates.
 */


var proxy = require('./index');

var socks = proxy.createServer().listen(1080);