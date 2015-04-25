(function (){
    // =========================================================================
    // Framework

    var $ = function (selector) {
        return document.querySelectorAll(selector);
    };

    $.extend = function(dest, source) {
        for (var i in source) {
            if (source.hasOwnProperty(i)) {
                dest[i] = source[i];
            }
        }
        return dest;
    };

    // =========================================================================
    // APP

    var log = console.log.bind(console);

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

    $.extend(Rumorboy.prototype, {
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
                conn.send(msgStr);
            }
        },

        /**
         * Send all current connections to the specified connection.
         */
        sendConnections: function(conn) {
            var connections = this.connections;
            for (var id in connections) {
                if (!connections.hasOwnProperty(id)) continue;

                conn.send(JSON.stringify({
                    id:     id,
                    type:   "CONNECT",
                    time:   connections[id].time,
                    isHost: id === this.host
                }));
            }
        },

        /**
         * When current host disconnects this method will find and set the new
         * host. If current user is the new host it will signal the server for
         * this.
         */
        setNextHost: function() {
            var claim = JSON.stringify({type: 'HOST_CLAIM'});
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
                this.getSocket().send(claim);
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
            this.handleChange(this.messages, this.connections);
        },

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Handlers

        handleHost: function() {
            if (!this.host) {
                this.host = this.peer.id;
                this.setCurrentTime(); // Host sets its own time and everybody else's.
            }

            log("I_AM_THE_HOST");
        },

        handleOpen: function() {
            this.connections[this.peer.id] = {
                conn: this.peer,
                time: this.now()
            };
            log("I_AM_ALIVE");
        },

        handleJoin: function(id) {
            var peer = this.peer;
            var conn = peer.connect(id);

            conn.on('open', function() {
                var now = this.now();
                this.connections[id] = {conn: conn, time: now};
                this.broadcast({type: "CONNECT", id: id, time: now, isHost: false});
                this.sendConnections(conn);
                this.sendHistory(conn);
            }.bind(this));

            var leave = function() {
                delete this.connections[id];
                log("[" + id + "] LEAVED_ME_AS_HOST");
            }.bind(this);

            conn.on('close', leave);
            conn.on('error', leave);

            log("[" + id + "] JOINED_ME_AS_HOST");
        },

        handleConnection: function(conn) {
            conn.on('data', function(data) {
                log(data);

                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }

                switch(data.type) {
                case "CONNECT":
                    var id     = data.id;
                    var isHost = data.isHost;
                    var time   = data.time;
                    var peer   = this.peer;

                    if (isHost) {
                        this.host = id;
                    }

                    if (data.id === peer.id) {
                        // Set correct peer time based on host data.
                        this.setTime(data.time);
                        return;
                    }

                    var conn = peer.connect(id);

                    conn.on('open', function() {
                        this.connections[id] = {conn: conn, time: time};
                        log("[" + id + "] PEER_CONNECTED");
                    }.bind(this));

                    var leave = function() {
                        delete this.connections[id];
                        log("[" + id + "] PEER_DISCONNECTED");
                        if (this.host === id) {
                            this.setNextHost();
                        }
                    }.bind(this);

                    conn.on('close', leave);
                    conn.on('error', leave);

                    break;
                case "MESSAGE":
                    this.storeMessage(data.payload);
                    break;
                case "CHAT_HISTORY":
                    this.storeMessageBatch(data.payload);
                    break;
                }
            }.bind(this));
        }
    });

    // =============================================================================
    // TESTS

    var assert = console.assert.bind(console);
    var FakeRB = function() {
        this._init = function(){};
        Rumorboy.call(this);
    };
    FakeRB.prototype = Rumorboy.prototype;

    (function(){
        var rb = new FakeRB();

    })();

    // =============================================================================
    // Start

    var App = window.RB = new Rumorboy();
})();
