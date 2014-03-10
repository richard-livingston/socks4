# Socks4

## Install

```bash
npm install socks4
```

## Introduction

This is a SOCKS4/a server implementation, it extends `net.server` so will have a familiar interface. The most basic example is:

```js
var socks4 = require('socks4');

socks4.createServer().listen(1080);
```

The above example creates a very simple server listening on port 1080, all traffic will be forwarded directly to the client.

Of course it's possible to create more advanced servers, allowing you to inspect, log, and manipulate traffic before forwarding it onto the client, continue reading to find out how...

## Events

 - `connect`: The client has issued a CONNECT command
 - `connection` The client has issued any command

*Note* - The server does not currently support the BIND command, this means that the 2 events above are equivelant. In the future there will also be a `bind` event for BIND commands.

## SocksRequest object

All events are emitted with a single argument, an instance of the `SocksRequest` class (`req`). This object has properties pertaining to the details of the request, and provides access to the raw socket connection.

**Properties**:

 - `req.host`: The hostname requested by the client, either an IPv4 or domain name
 - `req.port`: The port requested by the client
 - `req.socket`: The raw socket connection
 - `req.version`: The SOCKS protocol version, will always = `4`

**Methods**: 

 - `req.accept()`: Accept the clients request
 - `req.reject(reason)`: Reject the clients request and terminate the socket. Optionally supply a valid reason, see the constants in `socks4.protocol.status`

 *Note* - The request can only be accepted or rejected once, if you call either of these functions more than once then an error will be emitted.

**Events**:

 - `end`: Emitted when the client's socket is closed. It is always emitted

## Properties & Methods

 Remember that `socks4.Server` extends `net.Server` so will have all the same properties and methods, including `listen()` and `maxConnections`. The server only has one method of its own...
 
`server.proxyRequest(req, direct = true)`: This is a convenience method, it simply makes the connection to the remote host (as requested by the client), and forwards the response directly to the client.

 - `req`: The request object, instance of SocksRequest
 - `[direct]`: Pipe the response directly to the client's socket? Defaults to true.

Returns `net.Socket`, the socket to the remote server (not the client).

If no event listeners are added to the server, then this method is called automatically, that's how the introduction example works.

This method will call `req.accept()` if it has not been called already.


## Examples

In the introduction example we created a very basic server, because we didn't add any event listeners, the clients request was automatically accepted and satisfied. 

Once you add listeners to the `connect` or `connection` events then it will be your responsibilty to satisfy the client and proxy the request. To do this call `req.accept()` and then send some data to the client's socket.

**Only allow connections from one IP address:**

```js
var socks4 = require('socks4');
var server = socks4.createServer();

server.on('connect', function(req){
    if(req.socket.remoteAddress == '192.168.0.5'){
        req.accept();
        server.proxyRequest(req);
    }
    else{
        req.reject();
    }
});

server.listen(1080);
```

If the client's IP is 192.168.0.5, then the request is accepted. `server.proxyRequest()` is a convenience method, it simply makes a connection to the remote host (as requested by the client) and then forwards it on.


**Modify data before forwarding it:**

```js
var socks4 = require('socks4');
var server = socks4.createServer();

server.on('connect', function(req){
    var remote = server.proxyRequest(req, false);

    req.socket.pipe(remote);

    remote.on('data', function(buffer){
        var text = buffer.toString();

        text = text.replace('<h1>', '<h1>Hello World</h1>');
        req.socket.write(text);
    });
});

server.listen(1080);
```

In this example we replace the `H1` tag with "Hello World". `server.proxyRequest()` returns the socket of the remote host, and can be prevented from directly forwarding the response by passing false as the 2nd argument.

The code pipes the clients request to the remote server, then listens for incoming data from the remote host, this data is first altered before forwarding to the client.

Of course the above code is full of problems, for a start it would only work with HTTP traffic, and would completely break all binary data. If you really want to do something like this, you should write better code with some checks.

**Send the client something different**
```js
var socks4 = require('socks4');
var net = require('net');

var server = socks4.createServer();

server.on('connect', function(req){
    req.accept();
    var remote = net.connect(80, 'www.example.com', function(){
        remote.pipe(req.socket);
    });

    var http = 'GET / HTTP/1.1\r\n' +
               'Host: www.example.com\r\n\r\n';

    remote.write(http);
});

server.listen(1080);
```

In this example, instead of following the clients request, the server will always serve the homepage of example.com. It's possible to send any data you like to the client, just write it to `req.socket`. You don't always need to call `server.proxyRequest()`, it's just there for your convenience.

Once again, this example is full of problems, for a start you should at least check that the client is making an HTTP request, and perhaps that the port is 80. If the client is requesting anything other than HTTP, the response would just appear garbled to them.

## Error Handling

 - `socks4.Server` will emit the same errors as `net.Server`
 - `SocksRequest` will emit errors from the client's socket

All errors are emitted not thrown.


## Warnings

If you're setting up a public proxy, then you will have a security issue to overcome. Considder the following:

```js
require('socks4').createServer().listen(1080);
```

This code will blindly accept and follow any request, including your LAN. Anything your server has access to, the client will have access to aswell. You can overcome this problem by checking `req.host` before accepting the request.

You may think you have nothing of interest on your LAN, and that this problem doesn't apply to you, however, one example could be clients issuing requests to 127.0.0.1, they could attack your server from within.

## TODO

 - BIND command implementation
 - Ident authentication - http://www.ietf.org/rfc/rfc1413.txt