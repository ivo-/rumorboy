// =============================================================================
// Framework

var $ = function (selector) {
    return document.querySelector(selector);
};

// =============================================================================

var domain = document.domain;
var peer   = new Peer({host: 'localhost', port: 9000, path: '/main'});

peer.on('host', function(conn) {
    console.log("I am a hooost");
});

peer.on('join', function(id) {
    var conn = peer.connect(id);
    conn.on('open', function (){
        conn.send('hi from host!');
    });
    conn.on('close', function (){
        console.log(id + " leaved me");
    });
    console.log(id + " joined me");
});

peer.on('connection', function(conn) {
  conn.on('data', function(data){
    // Will print 'hi!'
    console.log(data);
  });
});
