// =============================================================================
// Framework

var $ = function (selector) {
    return document.querySelector(selector);
};

// =============================================================================

var domain = document.domain;
var peer   = new Peer({host: 'localhost', port: 9000, path: '/main'});

// var conn = peer.connect('7xdvdpk4ndn29000');
// conn.on('open', function(){
//   conn.send('hi!');
// });

peer.on('connection', function(conn) {
  conn.on('data', function(data){
    // Will print 'hi!'
    console.log(data);
  });
});
