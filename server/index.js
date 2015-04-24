// =============================================================================
// Dependencies

var PeerServer = require('peer').PeerServer;

var config = {
    port: 9000,
    path: '/main'
};

var database = {};

// =============================================================================
// Server

var server = PeerServer(config);
console.log("Server started on port: " + config.port);

server.on('connection', function (id, domain) {
    console.log('User connected with #', id, domain);
});

server.on('disconnect', function (id) {
    console.log('User disconnected with #', id);
});
