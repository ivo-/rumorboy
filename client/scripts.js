// =============================================================================

var peer = new Peer('someid', {host: 'localhost', port: 9000, path: '/myapp'});

// var conn = peer.connect('another-peers-id');
// conn.on('open', function(){
//   conn.send('hi!');
// });

peer.on('connection', function(conn) {
  conn.on('data', function(data){
    // Will print 'hi!'
    console.log(data);
  });
});
