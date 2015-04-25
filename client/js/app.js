// =============================================================================
// Dependencies

var React = require('react');
var Rumorboy = require('./client');

// =============================================================================
// Exports

var RB = window.Rumorboy = new Rumorboy();

// =============================================================================
// UI

var UI = React.createClass({
    getInitialState: function() {
        return {
            messages: [],
            connections: {}
        };
    },

    componentWillMount: function() {
        RB.handleChange = this.handleChange;
    },

    componentWillUnmount: function() {
        RB.handleChange = function() {};
    },

    handleChange: function(messages, connections) {
        this.setState({
            messages: messages,
            connections: connections
        });
    },

    render: function() {
        var messages = this.state.messages.map(function(msg, i){
            return (
                <li key={i} className="item">
                    {msg.id} - {msg.time}: {msg.text}
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
            <section>
                <header className="heading">
                   <h1>Rumorboy</h1>
                </header>
                <div className="connections">
                    <h2>Connections</h2>
                    <ul> {connections} </ul>
                </div>
                <div className="chat">
                    <h2>Messages</h2>
                    <ul> {messages} </ul>
                </div>
            </section>
        );
    }
});


React.render(
    <UI />,
    document.getElementById('app')
);

// =============================================================================
// Tests

require('./client_test');
