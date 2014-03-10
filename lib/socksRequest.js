/*
 * MIT License
 Copyright (c) 2014 Richard Livingston (richard@logoapps.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */


var events = require('events'),
    util = require('util');

var status = require('./constants').status,
    command = require('./constants').command;

var Socks4a = require('./socks4a');


/**
 * Represents a socks request for any supported socks version. Abstracts the logic of validating a request, and then
 * either accepting or rejecting it.
 *
 * @param {Buffer} buffer
 * @param {Socket} socket
 * @constructor
 * @extends EventEmitter
 */
function SocksRequest(buffer, socket){
    events.EventEmitter.call(this);

    var self = this;

    var version = buffer[0],
        command, port, host, valid;

    // Configure the variables according to the socks version
    switch(version){
        // Socks 4 and 4a
        case 0x04:
            command = Socks4a.getCommand(buffer);
            port = Socks4a.getPort(buffer);
            host = Socks4a.getHost(buffer);

            valid = command && port && host;
        break;

        // Unsupported socks version
        default:
            valid = false;
            // The socket is not closed in case the calling code wants to speak with it
        break;
    }

    valid = valid ? true : false;

    if(valid){
        // RFC recommends 2 minutes for both connect and bind commands
        socket.setTimeout(120000, function(){
            socket.end();
        });

        socket.on('error', function(err){
            self.emit('error', new Error(err.message));
        });

        socket.once('close', function(){
            self.emit('end');
            self.removeAllListeners();
        });
    }


    /**
     * Clients socket
     *
     * @type {Socket}
     */
    this.socket = socket;

    /**
     * Version of the socks protocol
     *
     * @type {Number}
     */
    this.version = version;

    /**
     * Connection command
     *
     * @type {Number}
     */
    this.command = command;

    /**
     * Port of the remote host where the client wishes to connect
     *
     * @type {Number}
     */
    this.port = port;

    /**
     * Either the IP or domain name of the remote host where the client wishes to connect
     *
     * @type {String}
     */
    this.host = host;

    /**
     * Is the connection request valid? A request is invalid when either the version is not supported, or the request
     * is malformed.
     *
     * @type {Boolean}
     */
    this.valid = valid;

    /**
     * Is all handshaking and negotiation with the client finished?
     *
     * @type {Boolean}
     */
    var handshakeComplete = false;
    this.__defineGetter__('handshakeComplete', function(){
        return handshakeComplete;
    });
    this.__defineSetter__('handshakeComplete', function(value){
        // Can only be set once
        if(value){
            handshakeComplete = true;
        }
    });
};


util.inherits(SocksRequest, events.EventEmitter);


/**
 * Accept the request and send the response to the client. After the response has been sent, the client will be
 * ready and expecting data from the remote host.
 *
 * @param {Socket} [remote] The socket which is connected to the remote host, only required for bind requests.
 */
SocksRequest.prototype.accept = function(remote){
    var self = this;

    if(this.handshakeComplete){
        return process.nextTick(function(){
            self.socket.end();
            self.emit('error', new Error('Handshaking has already completed, cannot accept the request.'))
        });
    }

    this.handshakeComplete = true;

    switch(this.version){
        case 0x04:
            switch(this.command){
                case command.CONNECT:
                    this.socket.write(new Buffer([0, status.GRANTED, 0, 0, 0, 0, 0, 0]));
                break;

                default:
                    // TODO - Implement bind method
                    process.nextTick(function(){
                        self.socket.end();
                        self.emit('error', new Error('SocksRequest does not support bind commands.'));
                    });
                break;
            }
        break;
    }
};


/**
 * Reject the response, send the response to the client, and end the socket.
 *
 * @param {Number} [reason] The reason for rejecting the connection, should be a valid reason for the protocol
 * version. If not passed, a version specific default value will be chosen depending on the current status.
 */
SocksRequest.prototype.reject = function(reason){
    var self = this;

    if(this.handshakeComplete){
        return process.nextTick(function(){
            self.socket.end();
            self.emit('error', new Error('Handshaking has already completed, cannot reject the request.'))
        });
    }

    this.handshakeComplete = true;

    switch(this.version){
        case 0x04:
            this.socket.end(new Buffer([0, reason || status.v4.REJECTED, 0, 0, 0, 0, 0, 0]));
        break;

        default:
            // Just to make sure the socket is always closed
            this.socket.end();
        break;
    }
};


module.exports = SocksRequest;