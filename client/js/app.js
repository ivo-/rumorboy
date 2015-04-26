// =============================================================================
// Dependencies

var React = require('react');
var Rumorboy = require('./client');
var Pokemon = require('./pokemon');

// =============================================================================
// Exports

var RB;

// =============================================================================
// UI

var UI = React.createClass({
    getInitialState: function() {
        return {
            connected: false,
            messages: [],
            connections: {}
        };
    },

    componentWillMount: function() {
        this.pockemons = {};
        RB = window.Rumorboy = new Rumorboy();
        RB.handleChange = this.handleChange;

        RB.on('host-connected', function() {
            this.setState({connected: true});
        }.bind(this));
    },

    componentWillUnmount: function() {
        RB.handleChange = function() {};
        RB.destroy();
    },

    handleChange: function(messages, connections) {
        this.setState({
            messages: messages,
            connections: connections
        });

        for (var id in this.pockemons) {
            if (!connections[id]) {
                Pokemon.freePokemon(this.pockemons[id]);
            }
        }
    },

    getPockemon: function(id) {
        if (this.pockemons[id]) {
            return this.pockemons[id];
        }

        return this.pockemons[id] = Pokemon.getPokemon();
    },

    render: function() {
        var messages = this.state.messages.map(function(msg, i){
            var p = this.getPockemon(msg.id);
            var time = new Date(msg.time).toLocaleTimeString('en-En', { hour12: false });

            return (
                <li key={i} className="item">
                    <div className="avatar" style={p.style}></div>
                    <div className="user">{p.name} - {time}:</div>
                    <div className="message">{msg.text}</div>
                </li>
            );
        }.bind(this));

        var connections = [], id, conn;
        for (id in this.state.connections) {
            conn = this.state.connections[id];
            connections.push(
                <li key={id} className="item">
                    {id} - {conn.time}
                </li>
            );
        }

        return (
            <div>
                <div className="heading">
                    <h1>Rumors at <em>{document.domain}</em></h1>
                </div>
                <div className="connections">
                    <h2>People online: {connections.length}</h2>
                </div>
                <div className="chat">
                    <h2>Messages</h2>
                    <ul>{messages}</ul>
                    <MessageForm />
                </div>
            </div>
        );
    }
});

var MessageForm = React.createClass({
    shouldComponentUpdate: function() {
        return false;
    },
    handleSubmit: function(e) {
        e.preventDefault();
        var text = this.refs.text.getDOMNode().value.trim();
        if(!text) {
            return;
        }

        RB.sendMessage(text);
        this.refs.text.getDOMNode().value = '';
    },
    render: function() {
        return (
            <form onSubmit={this.handleSubmit}>
                <input type='text' ref='text'/>
                <input type="submit" value="Send" />
            </form>
        );
    }
});

// =============================================================================
// Extension

var APP_ID = 'RUMORBOY___';

if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if(request.type !== 'click') return;

        var app = document.getElementById(APP_ID);
        sendResponse({activeIcon: !app});

        if(app) {
            React.unmountComponentAtNode(app);
            document.body.removeChild(app);
        } else {
            app = document.createElement('div');
            app.setAttribute('id', APP_ID);
            document.body.appendChild(app);

            React.render(<UI />, app);
        }
    });
} else {
    React.render(<UI />, document.querySelector('#' + APP_ID));
}

// =============================================================================
// Tests

require('./client_test');
