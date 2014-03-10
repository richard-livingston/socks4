/**
 * Created with JetBrains WebStorm.
 * User: Richard
 * Date: 05/03/14
 * Time: 14:43
 * To change this template use File | Settings | File Templates.
 */

// http://www.openssh.com/txt/socks4.protocol
// http://www.openssh.com/txt/socks4a.protocol

var net = require('net'),
    util = require('util'),
    listenerCount = require('events').EventEmitter.listenerCount;

var command = require('./constants').command,
    SocksRequest = require('./socksRequest');


/**
 * A SOCKS4a server based on net.Server
 *
 * @constructor
 * @extends net.Server
 */
function Server(){

    net.Server.apply(this, arguments);

    var self = this,
        base = net.Server.prototype;


    /**
     * Handles the socket connection, creates a SocksRequest object, and dispatches events.
     *
     * @param {Socket} socket
     */
    function handle(socket){
        socket.once('data', function(buffer){
            var req = new SocksRequest(buffer, socket);

            if(!req.valid){
                return socket.end();
            }

            var eventName = getCommandName(req.command);

            if(listenerCount(self, 'connection') > 0 || listenerCount(self, eventName) > 0){
                base.emit.call(self, 'connection', req); // Note that we call emit of the base class
                self.emit(eventName, req);
            }
            else{
                self.proxyRequest(req);
            }
        });
    };


    /**
     * Returns the name of the command given its numeric code
     *
     * @param {Number} code
     * @returns {string}
     */
    function getCommandName(code){
        switch(code){
            case command.CONNECT:
                return 'connect';
            break;

            case command.BIND:
                return 'bind';
            break;

            case command.UDP_ASSOCIATE:
                return 'udpassociate';
            break;

            default:
                return '';
            break;
        }
    };


    /**
     * Emit function is overwritten so that events can be listened for without actually adding a listener, if
     * listeners were added then they could be accidentally removed by user code. It is also useful to postpone the
     * dispatch of some events.
     *
     * @param {String} event
     * @param {Socket} socket
     */
    this.emit = function(event, socket){
        if(event == 'connection'){
            // Instead of dispatching the event, the handle() function will be called. The event MIGHT be emitted
            // from within handle() if some criteria are met.
            handle(socket);
        }
        else{
            base.emit.apply(self, arguments);
        }
    };

};


util.inherits(Server, net.Server);


/**
 * First accepts the clients request, then either connects to the remote host, or sets up a listening socket for bind
 * requests. Optionally forwards any data directly to the client, satisfying the request.
 *
 * @param {SocksRequest} req
 *
 * @param {Boolean} [direct] Should the resulting data be piped directly to the client? Defaults to true. If set to
 * false, then the client will not receive any data and you will need to satisfy the request, this is ideal if the data
 * needs to be inspected or manipulated before sending to the client.
 *
 * @returns {Socket} The remote socket for connect requests, or the local listening socket for bind requests
 */
Server.prototype.proxyRequest = function(req, direct){
    direct = direct === undefined ? true : false;

    switch(req.command){
        case command.CONNECT:
            var socket = req.socket;

            var remote = net.connect(req.port, req.host, function(){
                if(!req.handshakeComplete){
                    req.accept(remote);
                }

                if(direct){
                    // Ignore errors when directly piping to the client
                    remote.on('error', function(){});
                    req.on('error', function(){console.log('err')});

                    socket.pipe(remote).pipe(socket);
                }
            });

            return remote;
        break;

        case command.BIND:
            // TODO - Implement bind method
            req.reject();
        break;
    }
};


module.exports = Server;