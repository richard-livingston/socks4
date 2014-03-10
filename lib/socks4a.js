/**
 * Created with JetBrains WebStorm.
 * User: Richard
 * Date: 06/03/14
 * Time: 15:46
 * To change this template use File | Settings | File Templates.
 */

var command = require('./constants').command;


module.exports = {

    /**
     * Extracts the command code from the buffer
     *
     * @param {Buffer} buffer
     * @returns {?Number} Either the command code, or null if the code is invalid
     */
    getCommand : function(buffer){
        var c = buffer[1];
        return (c == command.CONNECT || c == command.BIND) ? c : null;
    },


    /**
     * Extracts the port number from the buffer
     *
     * @param {Buffer} buffer
     * @returns {Number}
     */
    getPort : function(buffer){
        return buffer.readUInt16BE(2, true);
    },


    /**
     * Extracts the host from the buffer. The host is either an IP address, or a domain name if SOCKS4a is used.
     *
     * @param {Buffer} buffer
     * @returns {String}
     */
    getHost : function(buffer){
        // SOCKS4a allows a domain name to be requested instead of just IP. For 4a requests the IP will
        // be 0.0.0.x, with x nonzero. The domain name will be included after the userId portion and terminated with a
        // null byte.
        if((buffer[4] + buffer[5] + buffer[6]) == 0 && buffer[7] > 0){
            // This is a SOCKS4a request - return domain name
            var arrayBuffer = Array.prototype.slice.call(buffer);

            var userIdStart = 8;
            var userIdEnd = arrayBuffer.indexOf(0x00, userIdStart);
            var domainNameStart = userIdEnd + 1;
            var domainNameEnd = arrayBuffer.indexOf(0x00, domainNameStart);

            return buffer.toString('utf8', domainNameStart, domainNameEnd);
        }
        else{
            // This is a SOCKS4 request - return IP address
            return Array.prototype.slice.call(buffer, 4, 8).join('.')
        }
    },


    /**
     * Extracts the user ID from the buffer
     *
     * @param {Buffer} buffer
     * @returns {String}
     */
    getUserId : function(buffer){
        var arrayBuffer = Array.prototype.slice.call(buffer);

        var userIdStart = 8;
        var userIdEnd = arrayBuffer.indexOf(0x00, userIdStart);

        return buffer.toString('utf8', userIdStart, userIdEnd);
    }

};