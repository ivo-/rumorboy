var Rumorboy = require('./client');

var assert = console.assert.bind(console);
var FakeRB = function() {
    this._init = function(){};
    Rumorboy.call(this);
};
FakeRB.prototype = Rumorboy.prototype;

(function(){
    var rb = new FakeRB();

})();
