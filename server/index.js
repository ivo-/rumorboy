// =============================================================================
// Dependencies

var config = {
    port: 9000,
    path: '/main'
};

var PeerServer = require('peer').PeerServer;
var log        = console.log.bind(console);
var database   = { domains: {}, hosts: {}, recent: {} };

// =============================================================================
// Server

var server = PeerServer(config);
console.log("Server started on port: " + config.port);

server.on('connection', function handleConnection (id, domain, socket) {
    if (!database.domains.hasOwnProperty(domain)) {
        // New connections cannot be pronounced as hosts until domain is removed
        // from recent list.
        if (database.recent[domain]) {
            log("[" + id + "] Wait for recent domain: " + domain);
            setTimeout(function() {
                handleConnection(id, domain, socket);
            }, 100);
            return;
        }

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

        // Wait 10s after host disconnects before enabling pronouncing new
        // connections as hosts. Give time to older connections to claim their
        // holy right to become hosts.
        database.recent[domain] = true;
        setTimeout(function() {
            delete database.recent[domain];
        }, 10000);

        log("[" + id + "] Disconnected HOST for domain: " + domain);
    } else {
        log("[" + id + "] Disconnected.");
    }
});

server.on('host-claim', function(id, domain, socket) {
    if (database.domains[domain]) {
        log("[" + id + "] Trying to claim an owned domain: " + domain);
    } else {
        // We have host claim from older connection for domain.
        delete database.recent[domain];

        database.domains[domain] = socket;
        database.hosts[id] = domain;

        log("[" + id + "] Claimed HOST for domain: " + domain);
        socket.send(JSON.stringify({ type: 'HOST' }));
    }
});
