// =============================================================================
// Dependencies

var config = {
    port: 9000,
    path: '/main'
};

var PeerServer = require('peer').PeerServer;
var log        = console.log.bind(console);
var database   = { domains: {}, hosts: {} };

// =============================================================================
// Server

var server = PeerServer(config);
console.log("Server started on port: " + config.port);

server.on('connection', function (id, domain, socket) {
    if (!database.domains.hasOwnProperty(domain)) {
        database.domains[domain] = socket;
        database.hosts[id] = domain;

        log("[" + id + "] Connected HOST for domain: " + domain);
        socket.send(JSON.stringify({ type: 'HOST' }));
    } else {
        var socket = database.domains[domain];
        socket.send(JSON.stringify({ type: 'JOIN', id: id}));

        log("[" + id + "] Connected for: " + domain);
    }
});

server.on('disconnect', function (id) {
    if (database.hosts[id] != null) {
        var domain = database.hosts[id];

        delete database.hosts[id];
        delete database.domains[domain];

        log("[" + id + "] Disconnected HOST for domain: " + domain);
    } else {
        log("[" + id + "] Disconnected.");
    }
});

// TODO: Wait 2s after host dead and then accept new hosts different than claim.
server.on('host-claim', function(id, domain, socket) {
    if (!database.domains.hasOwnProperty(domain)) {
        log("[" + id + "] Trying to claim an owned domain: " + domain);
    } else {
        database.domains[domain] = socket;
        database.hosts[id] = domain;

        log("[" + id + "] Connected HOST for domain: " + domain);
        socket.send(JSON.stringify({ type: 'HOST' }));
    }
});
