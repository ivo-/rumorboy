// =============================================================================
// Dependencies

var React = require('react');
var Rumorboy = require('./client');
var Pokemon = require('./pokemon');
var Assets = require('./assets_helper');

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
            connections: {},
            chat_hidden: false
        };
    },

    componentWillMount: function() {
        this.pockemons = {};
        RB = window.Rumorboy = new Rumorboy();

        RB.on('change', this.handleChange);
        RB.on('host-connected', function() {
            this.setState({connected: true});
        }.bind(this));
    },

    componentWillUnmount: function() {
        RB.removeAllListeners('change');
        RB.removeAllListeners('host-connected');
        RB.destroy();
    },

    componentWillUpdate: function() {
        if (!this.refs.messagesContainer) return;

        var lastMsg = this.state.messages[this.state.messages.length - 1];
        if (lastMsg && lastMsg.id === RB.peer.id) {
            this.shouldScrolledBottom = true;
        } else {
            var elm = this.refs.messagesContainer.getDOMNode();
            var delta = Math.abs(elm.scrollTop - (elm.scrollHeight - elm.clientHeight));
            this.shouldScrolledBottom = delta < 4;
        }
    },

    componentDidUpdate: function() {
        if (!this.refs.messagesContainer) return;

        var elm = this.refs.messagesContainer.getDOMNode();
        if (this.shouldScrolledBottom) {
            elm.scrollTop = elm.scrollHeight;
        }
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

    handleToggle: function() {
        this.setState({
            chat_hidden: !this.state.chat_hidden
        });
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
                    <div className="user"><span className="time">[{time}]</span> {p.name}:</div>
                    <div className="message">{msg.text}</div>
                </li>
            );
        }.bind(this));

        var connections = [], id, conn,
            chat_classes = 'chat',
            heading_classes = 'heading';

        for (id in this.state.connections) {
            conn = this.state.connections[id];
            connections.push(
                <li key={id} className="item">
                    {id} - {conn.time}
                </li>
            );
        }

        if(this.state.chat_hidden) {
            chat_classes    += " hidden";
            heading_classes += " closed";
        }

        if(!this.state.connected) {
            return (
                    <div className='heading closed'>
                    <img src={Assets.pathFor('images/spinner.gif')} alt='Loading'/>
                </div>);
        }

        return (
            <div>
                <div className={heading_classes} onClick={this.handleToggle}>
                    <h1>
                        Rumors at <em>{document.domain}</em>
                        <img className='chevron-up' src={Assets.pathFor('images/chevron-up.png')} alt='chevron-up'/>
                        <img className='chevron-down' src={Assets.pathFor('images/chevron-down.png')} alt='chevron-down'/>
                    </h1>
                    <div className="connections">
                        <h2>People online: {connections.length}</h2>
                    </div>
                </div>
                <div className={chat_classes}>
                    <ul className="messages" ref="messagesContainer">{messages}</ul>
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
        var elm = this.refs.text.getDOMNode();
        var text = elm.value.trim();
        if(!text) {
            return;
        }

        RB.sendMessage(text);
        elm.value = '';
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
