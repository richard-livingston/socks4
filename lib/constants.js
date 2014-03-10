/**
 * Created with JetBrains WebStorm.
 * User: Richard
 * Date: 06/03/14
 * Time: 15:43
 * To change this template use File | Settings | File Templates.
 */

module.exports.command = {
    CONNECT : 0x01,
    BIND : 0x02,
    UDP_ASSOCIATE: 0x03
};


module.exports.status = {
    GRANTED : 0x5a,
    REJECTED : 0x5b,
    REJECTED_IDENT_CONNECT : 0x5c,
    REJECTED_USERID_MISMATCH : 0x5d
};