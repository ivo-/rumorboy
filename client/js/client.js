// =========================================================================
// Helpers

var log = console.log.bind(console);
var extend = function(dest, source) {
    for (var i in source) {
        if (source.hasOwnProperty(i)) {
            dest[i] = source[i];
        }
    }
    return dest;
};

// =========================================================================
// APP

var EventEmitter = require('events').EventEmitter;

function Rumorboy() {
    this.host = null;
    this.connections = {};
    this.messages    = [];
    this.peer = null;

    /**
     * UI should define this to track updates on messages and connections.
     */
    this.handleChange = function(messages, connections){};

    this._init();
};

extend(Rumorboy.prototype, EventEmitter.prototype);
extend(Rumorboy.prototype, {
    _init: function() {
        this.peer = new Peer({
            host: 'localhost',
            port: 9000,
            path: '/main'
        });
        this.peer.on('open', this.handleOpen.bind(this));
        this.peer.on('host', this.handleHost.bind(this));
        this.peer.on('join', this.handleJoin.bind(this));
        this.peer.on('connection', this.handleConnection.bind(this));
    },

    destroy: function() {
        this.peer.destroy();
    },

    /**
     * Get current UTC timestamp.
     */
    now: function() {
        return Date.now();
    },

    /**
     * Get the underling signaling web socket.
     */
    getSocket: function() {
        return this.peer.socket._socket;
    },

    /**
     * Broadcast message to all the connections except to self.
     */
    broadcast: function (message) {
        var msgStr = JSON.stringify(message);
        for (var id in this.connections) {
            if (!this.connections.hasOwnProperty(id)) continue;
            if (id === this.peer.id) continue;

            var conn = this.connections[id].conn;
            if (!conn) continue;

            conn.send(msgStr);
        }
    },

    /**
     * Get user id by its connection object.
     */
    getSourceConnId: function(conn) {
        for (var id in this.connections) {
            if (this.connections[id].source === conn) {
                return id;
            }
        }

        return null;
    },

    /**
     * Send all current connections to the specified connection.
     */
    sendConnections: function(conn) {
        var connections = this.connections;
        for (var id in connections) {
            if (!connections.hasOwnProperty(id)) continue;

            conn.send(JSON.stringify({
                id:   id,
                type: "CONNECT",
                time: connections[id].time
            }));
        }
    },

    /**
     * When current host disconnects this method will find and set the new
     * host. If current user is the new host it will signal the server for
     * this.
     */
    setNextHost: function() {
        var connections = this.connections;
        var oldest = null;
        var oldestID = null;

        for (var id in connections) {
            if (!connections.hasOwnProperty(id)) return;
            var conn = connections[id];

            if (!oldest || conn.time < oldest.time) {
                oldest = conn;
                oldestID = id;
            }
        }

        if (!oldest) {
            log("Something bad happened. Cannot determine the host.");
            // window.location.reload();
            return;
        }

        if (oldestID === this.peer.id) {
            this.getSocket().send(JSON.stringify({type: 'HOST_CLAIM'}));
        } else {
            // TODO: What about host stealing?
        }

        this.host = oldestID;
        log("[" + this.host +"] NEW_HOST");
    },

    /**
     * Sets current peer connection time to current time.
     */
    setCurrentTime: function() {
        this.setTime(this.now());
    },

    /**
     * Sets current peer connection time.
     */
    setTime: function(time) {
        this.connections[this.peer.id].time = time;
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Messages

    /**
     * Send message to all connections
     *
     * @public
     */
    sendMessage: function(text) {
        var message = {
            id:   this.peer.id,
            time: this.now(),
            text: text
        };

        this.storeMessage(message);
        this.broadcast({
            type:    "MESSAGE",
            payload: message
        });
    },

    sendHistory: function(conn) {
        conn.send(JSON.stringify({
            type:    "CHAT_HISTORY",
            payload: this.messages
        }));
    },

    storeMessage: function(msg) {
        this.messages.push(msg);
        this.sortStoredMessages();
    },

    storeMessageBatch: function(batch) {
        this.messages.push.apply(this.messages, batch);
        this.sortStoredMessages();
    },

    sortStoredMessages: function() {
        this.messages.sort(function(m, n) {
            return m.time - n.time;
        });
        this.emitChange();
    },

    emitChange: function() {
        this.emit('change', this.messages, this.connections);
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Handlers

    handleHost: function() {
        if (!this.host) {
            this.host = this.peer.id;
            this.setCurrentTime(); // Host sets its own time and everybody else's.
        }

        this.emit('host-connected');
        log("I_AM_THE_HOST");
    },

    handleOpen: function() {
        this.connections[this.peer.id] = {
            conn:   this.peer,
            source: this.peer,
            time:   this.now()
        };
        this.emitChange();

        log("I_AM_ALIVE");
    },

    handleJoin: function(id) {
        var peer = this.peer;
        var conn = peer.connect(id);

        conn.on('open', function() {
            var now = this.now();
            this.connections[id] = {conn: conn, time: now};
            this.broadcast({type: "CONNECT", id: id, time: now});
            this.sendConnections(conn);
            this.sendHistory(conn);
            this.emitChange();
        }.bind(this));

        var leave = function() {
            delete this.connections[id];
            this.emitChange();
            log("[" + id + "] LEAVED_ME_AS_HOST");
        }.bind(this);

        conn.on('close', leave);
        conn.on('error', leave);

        log("[" + id + "] JOINED_ME_AS_HOST");
    },

    handleConnection: function(sourceConn) {
        // First connection is always from the host.
        if (this.host == null) {
            this.host = sourceConn.peer;
        }

        if (!this.connections[sourceConn.peer]) {
            this.connections[sourceConn.peer] = {};
        }

        this.connections[sourceConn.peer].source = sourceConn;
        this.emitChange();

        sourceConn.on('close', function(data) {
            delete this.connections[sourceConn.peer];
        }.bind(this));

        sourceConn.on('data', function(data) {
            log(data);

            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            switch(data.type) {
            case "CONNECT":
                // Accept connect messages only from the host.
                if (this.getSourceConnId(sourceConn) !== this.host) {
                    return;
                }

                var id     = data.id;
                var time   = data.time;
                var peer   = this.peer;

                // Set your correct peer time based on host data.
                if (id === peer.id) {
                    this.setTime(data.time);
                    return;
                }

                var conn = peer.connect(id);

                conn.on('open', function() {
                    this.connections[id] = {
                        conn: conn,
                        time: time,
                        source: this.connections[id] && this.connections[id].source
                    };
                    this.emitChange();
                    log("[" + id + "] PEER_CONNECTED");
                }.bind(this));

                var leave = function() {
                    delete this.connections[id];
                    this.emitChange();
                    log("[" + id + "] PEER_DISCONNECTED");
                    if (this.host === id) {
                        this.setNextHost();
                    }
                }.bind(this);

                conn.on('close', leave);
                conn.on('error', leave);

                break;
            case "CHAT_HISTORY":
                if (this.getSourceConnId(sourceConn) === this.host) {
                    this.storeMessageBatch(data.payload);
                    this.emit('host-connected');
                }
                break;
            case "MESSAGE":
                this.storeMessage(data.payload);
                break;
            }
        }.bind(this));
    }
});

// =============================================================================
// Exports

module.exports = Rumorboy;
