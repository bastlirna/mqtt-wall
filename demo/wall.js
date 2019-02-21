(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WallClient = exports.WallClient = function () {
    function WallClient(uri, username, password) {
        var _this = this;

        var qos = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

        _classCallCheck(this, WallClient);

        this.username = username;
        this.password = password;
        this.qos = qos;
        this.clientId = WallClient.generateClientId();

        // paho documentation: http://www.eclipse.org/paho/files/jsdoc/index.html
        this.client = new Paho.MQTT.Client(uri, this.clientId);

        this.client.onMessageArrived = function (message) {

            var payload = void 0,
                binary = void 0;

            try {
                payload = message.payloadString;
            } catch (e) {
                payload = message.payloadBytes;
                binary = true;
            }

            //console.log("Message arrived ", message.destinationName);
            _this.onMessage(message.destinationName, payload, message.retained, message.qos, binary);
        };

        this.client.onConnectionLost = function (error) {
            console.info("Connection lost ", error);

            if (WallClient.isNetworkError(error.errorCode)) {
                _this._reconnect();
                return;
            }

            _this.onError("Connection lost (" + error.errorMessage + ")", true);
        };

        this.currentTopic = null;

        this.onConnected = $.noop();
        this.onMessage = $.noop();
        this.onError = $.noop();
        this.onStateChanged = $.noop();

        this.firstConnection = true;
        this.attempts = 0;
        this._setState(WallClient.STATE.NEW);
    }

    _createClass(WallClient, [{
        key: "subscribe",
        value: function subscribe(topic, fn) {
            var _this2 = this;

            // unsubscribe current topic (if exists)
            if (this.currentTopic !== null && this.currentTopic !== topic) {
                var oldTopic = this.currentTopic;
                this.client.unsubscribe(oldTopic, {
                    onSuccess: function onSuccess() {
                        console.info("Unsubscribe '%s' success", oldTopic);
                    },
                    onFailure: function onFailure(error) {
                        console.error("Unsubscribe '%s' failure", oldTopic, error);
                    }
                });
            }

            // subscribe new topic
            this.client.subscribe(topic, {
                qos: this.qos,
                onSuccess: function onSuccess(r) {
                    console.info("Subscribe '%s' success", topic, r);
                    if (fn) {
                        fn();
                    }
                },
                onFailure: function onFailure(r) {
                    console.error("subscribe '%s' failure", topic, r);
                    _this2.onError("Subscribe failure");
                }
            });

            this.currentTopic = topic;
        }
    }, {
        key: "connect",
        value: function connect() {
            var _this3 = this;

            var connectOptions = {

                onSuccess: function onSuccess() {
                    console.info("Connect success");

                    _this3.attempts = 0;
                    _this3._setState(WallClient.STATE.CONNECTED);

                    if (_this3.firstConnection) {
                        _this3.firstConnection = false;
                        _this3.onConnected();
                    } else {
                        _this3.subscribe(_this3.currentTopic);
                    }
                },

                onFailure: function onFailure(error) {
                    console.error("Connect fail ", error);

                    if (WallClient.isNetworkError(error.errorCode)) {
                        _this3._reconnect();
                        return;
                    }

                    _this3.onError("Fail to connect", true);
                }
            };

            if (this.username && this.password) {
                connectOptions.userName = this.username;
                connectOptions.password = this.password;
            }

            this._setState(this.firstConnection ? WallClient.STATE.CONNECTING : WallClient.STATE.RECONNECTING);

            this.client.connect(connectOptions);
        }
    }, {
        key: "_reconnect",
        value: function _reconnect() {
            var _this4 = this;

            this.attempts++;
            this._setState(this.firstConnection ? WallClient.STATE.CONNECTING : WallClient.STATE.RECONNECTING);

            var t = (this.attempts - 1) * 2000;
            t = Math.max(Math.min(t, 30000), 100);

            setTimeout(function () {
                _this4.connect();
            }, t);
        }
    }, {
        key: "_setState",
        value: function _setState(state) {
            this.state = state;

            if (this.onStateChanged) this.onStateChanged(state);
        }
    }, {
        key: "toString",
        value: function toString() {
            // _getURI is undocumented function (it is URI used for underlying WebSocket connection)
            // see https://github.com/eclipse/paho.mqtt.javascript/blob/master/src/mqttws31.js#L1622
            return this.client._getURI();
        }
    }], [{
        key: "generateClientId",
        value: function generateClientId() {
            var time = Date.now() % 1000;
            var rnd = Math.round(Math.random() * 1000);
            return "wall" + (time * 1000 + rnd);
        }
    }, {
        key: "isNetworkError",
        value: function isNetworkError(code) {
            // possible codes: https://github.com/eclipse/paho.mqtt.javascript/blob/master/src/mqttws31.js#L166
            var networkErrors = [1 /* CONNECT_TIMEOUT */
            , 2 /* SUBSCRIBE_TIMEOUT */
            , 3 /* UNSUBSCRIBE_TIMEOUT */
            , 4 /* PING_TIMEOUT */
            , 6 /* CONNACK_RETURNCODE */
            , 7 /* SOCKET_ERROR */
            , 8 /* SOCKET_CLOSE */
            , 9 /* MALFORMED_UTF */
            , 11 /* INVALID_STATE */
            , 12 /* INVALID_TYPE */
            , 15 /* INVALID_STORED_DATA */
            , 16 /* INVALID_MQTT_MESSAGE_TYPE */
            , 17 /* MALFORMED_UNICODE */
            ];
            return networkErrors.indexOf(code) >= 0;
        }
    }]);

    return WallClient;
}();

WallClient.STATE = {
    NEW: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    RECONNECTING: 3,
    ERROR: 99
};

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Toolbar = exports.Footer = exports.MessageContainer = exports.MessageLine = exports.UI = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils.js');

var _client = require('./client.js');

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function formatByteArray(a) {
    var a2 = new Array(a.length);

    for (var i = a.length - 1; i >= 0; i--) {
        a2[i] = (a[i] <= 0x0F ? "0" : "") + a[i].toString(16).toUpperCase();
    }

    return a2.join(" ");
}

var UI = exports.UI = {};

UI.setTitle = function (topic) {
    document.title = "MQTT Wall" + (topic ? " for " + topic : "");
};

UI.toast = function (message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "info";
    var persistent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    return new Toast(message, type, persistent);
};

var Toast = function () {
    function Toast(message) {
        var _this = this;

        var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "info";
        var persistent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        _classCallCheck(this, Toast);

        this.$root = $("<div class='toast-item'>").text(message).addClass(type).hide().appendTo("#toast").fadeIn();

        if (persistent) {
            this.$root.addClass("persistent");
        } else {
            setTimeout(function () {
                _this.hide();
            }, 5000);
        }
    }

    _createClass(Toast, [{
        key: 'hide',
        value: function hide() {
            var _this2 = this;

            this.$root.slideUp().queue(function () {
                _this2.remove();
            });
        }
    }, {
        key: 'remove',
        value: function remove() {
            this.$root.remove();
        }
    }, {
        key: 'setMessage',
        value: function setMessage(message) {
            this.$root.text(message);
        }
    }]);

    return Toast;
}();

var MessageLine = exports.MessageLine = function () {
    function MessageLine(topic) {
        _classCallCheck(this, MessageLine);

        this.topic = topic;
        this.counter = 0;
        this.isNew = true;
        this.init();
    }

    _createClass(MessageLine, [{
        key: 'init',
        value: function init() {
            this.$root = $("<article class='message'>");

            var header = $("<header>").appendTo(this.$root);

            $("<h2>").text(this.topic).appendTo(header);

            if (window.config.showCounter) {
                this.$counterMark = $("<span class='mark counter' title='Message counter'>0</span>").appendTo(header);
            }

            this.$retainMark = $("<span class='mark retain' title='Retain message'>R</span>").appendTo(header);

            this.$qosMark = $("<span class='mark qos' title='Received message QoS'>QoS</span>").appendTo(header);

            this.$payload = $("<p>").appendTo(this.$root);
        }
    }, {
        key: 'highlight',
        value: function highlight() {
            var line = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            (line ? this.$root : this.$payload).stop().css({ backgroundColor: "#0CB0FF" }).animate({ backgroundColor: "#fff" }, 2000);
        }
    }, {
        key: 'update',
        value: function update(payload, retained, qos, binary) {
            this.counter++;
            this.isRetained = retained;

            if (this.$counterMark) {
                this.$counterMark.text(this.counter);
            }

            if (this.$qosMark) {
                if (qos === 0) {
                    this.$qosMark.hide();
                } else {
                    this.$qosMark.show();
                    this.$qosMark.text('QoS ' + qos);
                    this.$qosMark.attr("data-qos", qos);
                }
            }

            if (binary) {
                payload = "HEX: " + formatByteArray(payload);
                this.isSystemPayload = true;
            } else {
                if (payload === "") {
                    payload = "NULL";
                    this.isSystemPayload = true;
                } else {
                    this.isSystemPayload = false;
                }
            }

            this.$payload.text(payload);
            this.highlight(this.isNew);

            if (this.isNew) {
                this.isNew = false;
            }
        }
    }, {
        key: 'isRetained',
        set: function set(value) {
            this.$retainMark[value ? 'show' : 'hide']();
        }
    }, {
        key: 'isSystemPayload',
        set: function set(value) {
            this.$payload.toggleClass("sys", value);
        }
    }]);

    return MessageLine;
}();

var MessageContainer = exports.MessageContainer = function () {
    function MessageContainer($parent) {
        _classCallCheck(this, MessageContainer);

        this.sort = 'Alphabetically';
        this.$parent = $parent;
        this.init();
    }

    _createClass(MessageContainer, [{
        key: 'init',
        value: function init() {
            this.reset();
        }
    }, {
        key: 'reset',
        value: function reset() {
            this.lines = {};
            this.topics = [];
            this.$parent.html("");
        }
    }, {
        key: 'update',
        value: function update(topic, payload, retained, qos, binary) {

            if (!this.lines[topic]) {

                var line = new MessageLine(topic, this.$parent);

                this['addLine' + this.sort](line);
                this.lines[topic] = line;
            }

            this.lines[topic].update(payload, retained, qos, binary);
        }
    }, {
        key: 'addLineAlphabetically',
        value: function addLineAlphabetically(line) {

            if (this.topics.length === 0) {
                this.addLineChronologically(line);
                return;
            }

            var topic = line.topic;

            this.topics.push(topic);
            this.topics.sort();

            var n = this.topics.indexOf(topic);

            if (n === 0) {
                this.$parent.prepend(line.$root);
                return;
            }

            var prev = this.topics[n - 1];
            line.$root.insertAfter(this.lines[prev].$root);
        }
    }, {
        key: 'addLineChronologically',
        value: function addLineChronologically(line) {
            this.topics.push(line.topic);
            this.$parent.append(line.$root);
        }
    }]);

    return MessageContainer;
}();

MessageContainer.SORT_APLHA = "Alphabetically";
MessageContainer.SORT_CHRONO = "Chronologically";

var Footer = exports.Footer = function () {
    function Footer() {
        _classCallCheck(this, Footer);
    }

    _createClass(Footer, [{
        key: 'clientId',
        set: function set(value) {
            $("#status-client").text(value);
        }
    }, {
        key: 'uri',
        set: function set(value) {
            $("#status-host").text(value);
        }
    }, {
        key: 'state',
        set: function set(value) {
            var text = void 0,
                className = void 0;

            switch (value) {
                case _client.WallClient.STATE.NEW:
                    text = "";
                    className = "connecting";
                    break;
                case _client.WallClient.STATE.CONNECTING:
                    text = "connecting...";
                    className = "connecting";
                    break;
                case _client.WallClient.STATE.CONNECTED:
                    text = "connected";
                    className = "connected";
                    break;
                case _client.WallClient.STATE.RECONNECTING:
                    text = "reconnecting...";
                    className = "connecting";
                    break;
                case _client.WallClient.STATE.ERROR:
                    text = "not connected";
                    className = "fail";
                    break;
                default:
                    throw new Error("Unknown WallClient.STATE");
            }

            if (this.reconnectAttempts > 1) {
                text += ' (' + this.reconnectAttempts + ')';
            }

            $("#status-state").removeClass().addClass(className);
            $("#status-state span").text(text);
        }
    }]);

    return Footer;
}();

var Toolbar = exports.Toolbar = function (_EventEmitter) {
    _inherits(Toolbar, _EventEmitter);

    function Toolbar(parent) {
        _classCallCheck(this, Toolbar);

        var _this3 = _possibleConstructorReturn(this, (Toolbar.__proto__ || Object.getPrototypeOf(Toolbar)).call(this));

        _this3.$parent = parent;
        _this3.$topic = parent.find("#topic");

        _this3.initEventHandlers();
        _this3.initDefaultTopic();
        return _this3;
    }

    _createClass(Toolbar, [{
        key: 'initEventHandlers',
        value: function initEventHandlers() {
            var _this4 = this;

            var inhibitor = false;

            this.$topic.keyup(function (e) {
                if (e.which === 13) {
                    // ENTER
                    _this4.$topic.blur();
                }

                if (e.keyCode === 27) {
                    // ESC
                    inhibitor = true;
                    _this4.$topic.blur();
                }
            });

            this.$topic.focus(function (e) {
                inhibitor = false;
            });

            this.$topic.blur(function (e) {
                if (inhibitor) {
                    _this4.updateUi(); // revert changes
                } else {
                    _this4.inputChanged();
                }
            });
        }
    }, {
        key: 'inputChanged',
        value: function inputChanged() {
            var newTopic = this.$topic.val();

            if (newTopic === this._topic) {
                return;
            }

            this._topic = newTopic;
            this.emit("topic", newTopic);
        }
    }, {
        key: 'initDefaultTopic',
        value: function initDefaultTopic() {
            // URL hash 
            if (location.hash !== "") {
                this._topic = location.hash.substr(1);
            } else {
                this._topic = config.defaultTopic || "/#";
            }

            this.updateUi();
        }
    }, {
        key: 'updateUi',
        value: function updateUi() {
            this.$topic.val(this._topic);
        }
    }, {
        key: 'topic',
        get: function get() {
            return this._topic;
        },
        set: function set(value) {
            this._topic = value;
            this.updateUi();
            this.emit("topic", value);
        }
    }]);

    return Toolbar;
}(_utils.EventEmitter);

},{"./client.js":1,"./utils.js":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Simple version of node.js's EventEmiter class
 */
var EventEmitter = exports.EventEmitter = function () {
    function EventEmitter() {
        _classCallCheck(this, EventEmitter);
    }

    _createClass(EventEmitter, [{
        key: 'on',


        /**
         * Add event handler of givent type
         */
        value: function on(type, fn) {
            if (this['_on' + type] === undefined) {
                this['_on' + type] = [];
            }

            this['_on' + type].push(fn);
        }

        /**
         * Emit event of type.
         * 
         * All arguments will be applay to callback, preserve context of object this.
         */

    }, {
        key: 'emit',
        value: function emit(type) {
            var _this = this;

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            if (this['_on' + type]) {
                this['_on' + type].forEach(function (fn) {
                    return fn.apply(_this, args);
                });
            }
        }
    }]);

    return EventEmitter;
}();

},{}],4:[function(require,module,exports){
"use strict";

var _client = require("./client.js");

var _ui = require("./ui.js");

// --- Main -------------------------------------------------------------------

// decode password base64 (if empty leve it)
var password = config.server.password !== undefined ? atob(config.server.password) : undefined;

var client = new _client.WallClient(config.server.uri, config.server.username, password, config.qos);
var messages = new _ui.MessageContainer($("section.messages"));
var footer = new _ui.Footer();
var toolbar = new _ui.Toolbar($("#header"));

messages.sort = config.alphabeticalSort ? _ui.MessageContainer.SORT_APLHA : _ui.MessageContainer.SORT_CHRONO;

footer.clientId = client.clientId;
footer.uri = client.toString();
footer.state = 0;

function load() {
    var topic = toolbar.topic;

    client.subscribe(topic, function () {
        _ui.UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    messages.reset();
}

toolbar.on("topic", function () {
    load();
});

client.onConnected = function () {
    load();
    _ui.UI.toast("Connected to host " + client.toString());
};

client.onError = function (description, isFatal) {
    _ui.UI.toast(description, "error", isFatal);
};

var reconnectingToast = null;

client.onStateChanged = function (state) {
    footer.reconnectAttempts = client.attempts;
    footer.state = state;

    if ((state === _client.WallClient.STATE.CONNECTING || state === _client.WallClient.STATE.RECONNECTING) && client.attempts >= 2) {
        var msg = state === _client.WallClient.STATE.CONNECTING ? "Fail to connect. Trying to connect... (" + client.attempts + " attempts)" : "Connection lost. Trying to reconnect... (" + client.attempts + " attempts)";

        if (reconnectingToast === null) {
            reconnectingToast = _ui.UI.toast(msg, "error", true);
        } else {
            reconnectingToast.setMessage(msg);
        }
    }

    if (state === _client.WallClient.STATE.CONNECTED && reconnectingToast !== null) {
        reconnectingToast.hide();
        reconnectingToast = null;

        if (client.firstConnection === false) {
            _ui.UI.toast("Reconnected");
        }
    }
};

client.onMessage = function (topic, msg, retained, qos, binary) {
    messages.update(topic, msg, retained, qos, binary);
};

client.connect();

},{"./client.js":1,"./ui.js":2}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGpzXFxjbGllbnQuanMiLCJzcmNcXGpzXFx1aS5qcyIsInNyY1xcanNcXHV0aWxzLmpzIiwic3JjXFxqc1xcd2FsbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7SUNBYSxVLFdBQUEsVTtBQUVULHdCQUFZLEdBQVosRUFBaUIsUUFBakIsRUFBMkIsUUFBM0IsRUFBOEM7QUFBQTs7QUFBQSxZQUFULEdBQVMsdUVBQUgsQ0FBRzs7QUFBQTs7QUFFMUMsYUFBSyxRQUFMLEdBQWdCLFFBQWhCO0FBQ0EsYUFBSyxRQUFMLEdBQWdCLFFBQWhCO0FBQ0EsYUFBSyxHQUFMLEdBQVcsR0FBWDtBQUNBLGFBQUssUUFBTCxHQUFnQixXQUFXLGdCQUFYLEVBQWhCOztBQUVBO0FBQ0EsYUFBSyxNQUFMLEdBQWMsSUFBSSxLQUFLLElBQUwsQ0FBVSxNQUFkLENBQXFCLEdBQXJCLEVBQTBCLEtBQUssUUFBL0IsQ0FBZDs7QUFFQSxhQUFLLE1BQUwsQ0FBWSxnQkFBWixHQUErQixVQUFDLE9BQUQsRUFBYTs7QUFFeEMsZ0JBQUksZ0JBQUo7QUFBQSxnQkFBYSxlQUFiOztBQUVBLGdCQUFHO0FBQ0MsMEJBQVUsUUFBUSxhQUFsQjtBQUNILGFBRkQsQ0FFRSxPQUFNLENBQU4sRUFBUztBQUNQLDBCQUFVLFFBQVEsWUFBbEI7QUFDQSx5QkFBUyxJQUFUO0FBQ0g7O0FBRUQ7QUFDQSxrQkFBSyxTQUFMLENBQWUsUUFBUSxlQUF2QixFQUF3QyxPQUF4QyxFQUFpRCxRQUFRLFFBQXpELEVBQW1FLFFBQVEsR0FBM0UsRUFBZ0YsTUFBaEY7QUFDSCxTQWJEOztBQWVBLGFBQUssTUFBTCxDQUFZLGdCQUFaLEdBQStCLFVBQUMsS0FBRCxFQUFXO0FBQ3RDLG9CQUFRLElBQVIsQ0FBYSxrQkFBYixFQUFpQyxLQUFqQzs7QUFFQSxnQkFBSSxXQUFXLGNBQVgsQ0FBMEIsTUFBTSxT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RCxRQUFJLFVBQVUsbUJBQVcsS0FBWCxDQUFpQixTQUEzQixJQUF3QyxzQkFBc0IsSUFBbEUsRUFBd0U7QUFDcEUsMEJBQWtCLElBQWxCO0FBQ0EsNEJBQW9CLElBQXBCOztBQUVBLFlBQUksT0FBTyxlQUFQLEtBQTJCLEtBQS9CLEVBQXNDO0FBQ2xDLG1CQUFHLEtBQUgsQ0FBUyxhQUFUO0FBQ0g7QUFDSjtBQUNKLENBeEJEOztBQTBCQSxPQUFPLFNBQVAsR0FBbUIsVUFBQyxLQUFELEVBQVEsR0FBUixFQUFhLFFBQWIsRUFBdUIsR0FBdkIsRUFBNEIsTUFBNUIsRUFBdUM7QUFDdEQsYUFBUyxNQUFULENBQWdCLEtBQWhCLEVBQXVCLEdBQXZCLEVBQTRCLFFBQTVCLEVBQXNDLEdBQXRDLEVBQTJDLE1BQTNDO0FBQ0gsQ0FGRDs7QUFJQSxPQUFPLE9BQVAiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZXhwb3J0IGNsYXNzIFdhbGxDbGllbnQge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHVyaSwgdXNlcm5hbWUsIHBhc3N3b3JkLCBxb3MgPSAwKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzd29yZDtcclxuICAgICAgICB0aGlzLnFvcyA9IHFvcztcclxuICAgICAgICB0aGlzLmNsaWVudElkID0gV2FsbENsaWVudC5nZW5lcmF0ZUNsaWVudElkKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gcGFobyBkb2N1bWVudGF0aW9uOiBodHRwOi8vd3d3LmVjbGlwc2Uub3JnL3BhaG8vZmlsZXMvanNkb2MvaW5kZXguaHRtbFxyXG4gICAgICAgIHRoaXMuY2xpZW50ID0gbmV3IFBhaG8uTVFUVC5DbGllbnQodXJpLCB0aGlzLmNsaWVudElkKTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNsaWVudC5vbk1lc3NhZ2VBcnJpdmVkID0gKG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBwYXlsb2FkLCBiaW5hcnk7XHJcblxyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBwYXlsb2FkID0gbWVzc2FnZS5wYXlsb2FkU3RyaW5nO1xyXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcclxuICAgICAgICAgICAgICAgIHBheWxvYWQgPSBtZXNzYWdlLnBheWxvYWRCeXRlcyBcclxuICAgICAgICAgICAgICAgIGJpbmFyeSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJNZXNzYWdlIGFycml2ZWQgXCIsIG1lc3NhZ2UuZGVzdGluYXRpb25OYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5vbk1lc3NhZ2UobWVzc2FnZS5kZXN0aW5hdGlvbk5hbWUsIHBheWxvYWQsIG1lc3NhZ2UucmV0YWluZWQsIG1lc3NhZ2UucW9zLCBiaW5hcnkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuY2xpZW50Lm9uQ29ubmVjdGlvbkxvc3QgPSAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiQ29ubmVjdGlvbiBsb3N0IFwiLCBlcnJvcik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoV2FsbENsaWVudC5pc05ldHdvcmtFcnJvcihlcnJvci5lcnJvckNvZGUpKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlY29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uRXJyb3IoYENvbm5lY3Rpb24gbG9zdCAoJHtlcnJvci5lcnJvck1lc3NhZ2V9KWAsIHRydWUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFRvcGljID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5vbkNvbm5lY3RlZCA9ICQubm9vcCgpO1xyXG4gICAgICAgIHRoaXMub25NZXNzYWdlID0gJC5ub29wKCk7XHJcbiAgICAgICAgdGhpcy5vbkVycm9yID0gJC5ub29wKCk7XHJcbiAgICAgICAgdGhpcy5vblN0YXRlQ2hhbmdlZCA9ICQubm9vcCgpO1xyXG5cclxuICAgICAgICB0aGlzLmZpcnN0Q29ubmVjdGlvbiA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5hdHRlbXB0cyA9IDA7XHJcbiAgICAgICAgdGhpcy5fc2V0U3RhdGUoV2FsbENsaWVudC5TVEFURS5ORVcpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBnZW5lcmF0ZUNsaWVudElkKCkge1xyXG4gICAgICAgIHZhciB0aW1lID0gRGF0ZS5ub3coKSAlIDEwMDA7XHJcbiAgICAgICAgdmFyIHJuZCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIHJldHVybiBgd2FsbCR7dGltZSoxMDAwICsgcm5kfWA7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGlzTmV0d29ya0Vycm9yIChjb2RlKSB7XHJcbiAgICAgICAgLy8gcG9zc2libGUgY29kZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9lY2xpcHNlL3BhaG8ubXF0dC5qYXZhc2NyaXB0L2Jsb2IvbWFzdGVyL3NyYy9tcXR0d3MzMS5qcyNMMTY2XHJcbiAgICAgICAgY29uc3QgbmV0d29ya0Vycm9ycyA9IFsgXHJcbiAgICAgICAgICAgIDEgLyogQ09OTkVDVF9USU1FT1VUICovLFxyXG4gICAgICAgICAgICAyIC8qIFNVQlNDUklCRV9USU1FT1VUICovLCBcclxuICAgICAgICAgICAgMyAvKiBVTlNVQlNDUklCRV9USU1FT1VUICovLFxyXG4gICAgICAgICAgICA0IC8qIFBJTkdfVElNRU9VVCAqLyxcclxuICAgICAgICAgICAgNiAvKiBDT05OQUNLX1JFVFVSTkNPREUgKi8sXHJcbiAgICAgICAgICAgIDcgLyogU09DS0VUX0VSUk9SICovLFxyXG4gICAgICAgICAgICA4IC8qIFNPQ0tFVF9DTE9TRSAqLyxcclxuICAgICAgICAgICAgOSAvKiBNQUxGT1JNRURfVVRGICovLFxyXG4gICAgICAgICAgICAxMSAvKiBJTlZBTElEX1NUQVRFICovLFxyXG4gICAgICAgICAgICAxMiAvKiBJTlZBTElEX1RZUEUgKi8sXHJcbiAgICAgICAgICAgIDE1IC8qIElOVkFMSURfU1RPUkVEX0RBVEEgKi8sXHJcbiAgICAgICAgICAgIDE2IC8qIElOVkFMSURfTVFUVF9NRVNTQUdFX1RZUEUgKi8sXHJcbiAgICAgICAgICAgIDE3IC8qIE1BTEZPUk1FRF9VTklDT0RFICovLFxyXG4gICAgICAgIF07XHJcbiAgICAgICAgcmV0dXJuIG5ldHdvcmtFcnJvcnMuaW5kZXhPZihjb2RlKSA+PSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHN1YnNjcmliZSAodG9waWMsIGZuKSB7XHJcbiAgICBcclxuICAgICAgICAvLyB1bnN1YnNjcmliZSBjdXJyZW50IHRvcGljIChpZiBleGlzdHMpXHJcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFRvcGljICE9PSBudWxsICYmIHRoaXMuY3VycmVudFRvcGljICE9PSB0b3BpYykge1xyXG4gICAgICAgICAgICBsZXQgb2xkVG9waWMgPSB0aGlzLmN1cnJlbnRUb3BpYztcclxuICAgICAgICAgICAgdGhpcy5jbGllbnQudW5zdWJzY3JpYmUob2xkVG9waWMsIHtcclxuICAgICAgICAgICAgICAgIG9uU3VjY2VzczogKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIlVuc3Vic2NyaWJlICclcycgc3VjY2Vzc1wiLCBvbGRUb3BpYyk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVW5zdWJzY3JpYmUgJyVzJyBmYWlsdXJlXCIsIG9sZFRvcGljLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgIC8vIHN1YnNjcmliZSBuZXcgdG9waWNcclxuICAgICAgICB0aGlzLmNsaWVudC5zdWJzY3JpYmUodG9waWMsIHtcclxuICAgICAgICAgICAgcW9zOiB0aGlzLnFvcyxcclxuICAgICAgICAgICAgb25TdWNjZXNzOiAocikgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiU3Vic2NyaWJlICclcycgc3VjY2Vzc1wiLCB0b3BpYywgcik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcclxuICAgICAgICAgICAgICAgICAgICBmbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwic3Vic2NyaWJlICclcycgZmFpbHVyZVwiLCB0b3BpYywgcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRXJyb3IoXCJTdWJzY3JpYmUgZmFpbHVyZVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRUb3BpYyA9IHRvcGljO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbm5lY3QgKCkge1xyXG5cclxuICAgICAgICBsZXQgY29ubmVjdE9wdGlvbnMgPSB7XHJcblxyXG4gICAgICAgICAgICBvblN1Y2Nlc3MgOiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJDb25uZWN0IHN1Y2Nlc3NcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRlbXB0cyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRTdGF0ZShXYWxsQ2xpZW50LlNUQVRFLkNPTk5FQ1RFRCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZpcnN0Q29ubmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyc3RDb25uZWN0aW9uID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNvbm5lY3RlZCgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1YnNjcmliZSh0aGlzLmN1cnJlbnRUb3BpYyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICBvbkZhaWx1cmUgOiAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJDb25uZWN0IGZhaWwgXCIsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKFdhbGxDbGllbnQuaXNOZXR3b3JrRXJyb3IoZXJyb3IuZXJyb3JDb2RlKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRXJyb3IoXCJGYWlsIHRvIGNvbm5lY3RcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XHJcbiAgICAgICAgICAgIGNvbm5lY3RPcHRpb25zLnVzZXJOYW1lID0gdGhpcy51c2VybmFtZTtcclxuICAgICAgICAgICAgY29ubmVjdE9wdGlvbnMucGFzc3dvcmQgPSB0aGlzLnBhc3N3b3JkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fc2V0U3RhdGUodGhpcy5maXJzdENvbm5lY3Rpb24gPyBXYWxsQ2xpZW50LlNUQVRFLkNPTk5FQ1RJTkcgOiBXYWxsQ2xpZW50LlNUQVRFLlJFQ09OTkVDVElORylcclxuXHJcbiAgICAgICAgdGhpcy5jbGllbnQuY29ubmVjdChjb25uZWN0T3B0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgX3JlY29ubmVjdCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYXR0ZW1wdHMgKys7XHJcbiAgICAgICAgdGhpcy5fc2V0U3RhdGUodGhpcy5maXJzdENvbm5lY3Rpb24gPyBXYWxsQ2xpZW50LlNUQVRFLkNPTk5FQ1RJTkcgOiBXYWxsQ2xpZW50LlNUQVRFLlJFQ09OTkVDVElORyk7XHJcblxyXG4gICAgICAgIGxldCB0ID0gKHRoaXMuYXR0ZW1wdHMtMSkgKiAyMDAwO1xyXG4gICAgICAgIHQgPSBNYXRoLm1heChNYXRoLm1pbih0LCAzMDAwMCksIDEwMCk7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNvbm5lY3QoKTtcclxuICAgICAgICB9LCB0KTtcclxuICAgIH1cclxuXHJcbiAgICBfc2V0U3RhdGUgKHN0YXRlKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5vblN0YXRlQ2hhbmdlZClcclxuICAgICAgICAgICAgdGhpcy5vblN0YXRlQ2hhbmdlZChzdGF0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdG9TdHJpbmcgKCkge1xyXG4gICAgICAgIC8vIF9nZXRVUkkgaXMgdW5kb2N1bWVudGVkIGZ1bmN0aW9uIChpdCBpcyBVUkkgdXNlZCBmb3IgdW5kZXJseWluZyBXZWJTb2NrZXQgY29ubmVjdGlvbilcclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2VjbGlwc2UvcGFoby5tcXR0LmphdmFzY3JpcHQvYmxvYi9tYXN0ZXIvc3JjL21xdHR3czMxLmpzI0wxNjIyXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xpZW50Ll9nZXRVUkkoKTtcclxuICAgIH1cclxufVxyXG5cclxuV2FsbENsaWVudC5TVEFURSA9IHtcclxuICAgIE5FVzogMCxcclxuICAgIENPTk5FQ1RJTkc6IDEsXHJcbiAgICBDT05ORUNURUQ6IDIsXHJcbiAgICBSRUNPTk5FQ1RJTkc6IDMsXHJcbiAgICBFUlJPUjogOTlcclxufTtcclxuIiwiaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJy4vdXRpbHMuanMnO1xyXG5pbXBvcnQge1dhbGxDbGllbnR9IGZyb20gJy4vY2xpZW50LmpzJztcclxuXHJcbmZ1bmN0aW9uIGZvcm1hdEJ5dGVBcnJheShhKSB7XHJcbiAgICB2YXIgYTIgPSBuZXcgQXJyYXkoYS5sZW5ndGgpO1xyXG5cclxuICAgIGZvcih2YXIgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICBhMltpXSA9ICgoYVtpXSA8PSAweDBGKSA/IFwiMFwiIDogXCJcIikgKyBhW2ldLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhMi5qb2luKFwiIFwiKTtcclxufVxyXG5cclxuZXhwb3J0IHZhciBVSSA9IHt9O1xyXG5cclxuVUkuc2V0VGl0bGUgPSBmdW5jdGlvbiAodG9waWMpIHtcclxuICAgIGRvY3VtZW50LnRpdGxlID0gXCJNUVRUIFdhbGxcIiArICh0b3BpYyA/IChcIiBmb3IgXCIgKyB0b3BpYykgOiBcIlwiKTtcclxufTtcclxuIFxyXG5VSS50b2FzdCA9IGZ1bmN0aW9uIChtZXNzYWdlLCB0eXBlID0gXCJpbmZvXCIsIHBlcnNpc3RlbnQgPSBmYWxzZSkge1xyXG4gICAgcmV0dXJuIG5ldyBUb2FzdChtZXNzYWdlLCB0eXBlLCBwZXJzaXN0ZW50KTtcclxufTtcclxuXHJcbmNsYXNzIFRvYXN0IHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciAobWVzc2FnZSwgdHlwZSA9IFwiaW5mb1wiLCBwZXJzaXN0ZW50ID0gZmFsc2UpIHtcclxuXHJcbiAgICAgICAgdGhpcy4kcm9vdCA9ICQoXCI8ZGl2IGNsYXNzPSd0b2FzdC1pdGVtJz5cIilcclxuICAgICAgICAgICAgLnRleHQobWVzc2FnZSlcclxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUpXHJcbiAgICAgICAgICAgIC5oaWRlKClcclxuICAgICAgICAgICAgLmFwcGVuZFRvKFwiI3RvYXN0XCIpXHJcbiAgICAgICAgICAgIC5mYWRlSW4oKTtcclxuXHJcbiAgICAgICAgaWYgKHBlcnNpc3RlbnQpIHtcclxuICAgICAgICAgICAgdGhpcy4kcm9vdC5hZGRDbGFzcyhcInBlcnNpc3RlbnRcIik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuaGlkZSgpOyB9LCA1MDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSAoKSB7XHJcbiAgICAgICAgdGhpcy4kcm9vdC5zbGlkZVVwKCkucXVldWUoKCkgPT4geyB0aGlzLnJlbW92ZSgpOyB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUgKCkge1xyXG4gICAgICAgIHRoaXMuJHJvb3QucmVtb3ZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TWVzc2FnZSAobWVzc2FnZSkge1xyXG4gICAgICAgIHRoaXMuJHJvb3QudGV4dChtZXNzYWdlKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VMaW5lIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcih0b3BpYyl7XHJcbiAgICAgICAgdGhpcy50b3BpYyA9IHRvcGljO1xyXG4gICAgICAgIHRoaXMuY291bnRlciA9IDA7XHJcbiAgICAgICAgdGhpcy5pc05ldyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLiRyb290ID0gJChcIjxhcnRpY2xlIGNsYXNzPSdtZXNzYWdlJz5cIik7XHJcblxyXG4gICAgICAgIHZhciBoZWFkZXIgPSAkKFwiPGhlYWRlcj5cIikuYXBwZW5kVG8odGhpcy4kcm9vdCk7XHJcblxyXG4gICAgICAgICQoXCI8aDI+XCIpXHJcbiAgICAgICAgICAgIC50ZXh0KHRoaXMudG9waWMpXHJcbiAgICAgICAgICAgIC5hcHBlbmRUbyhoZWFkZXIpO1xyXG5cclxuICAgICAgICBpZiAod2luZG93LmNvbmZpZy5zaG93Q291bnRlcikge1xyXG4gICAgICAgICAgICB0aGlzLiRjb3VudGVyTWFyayA9ICQoXCI8c3BhbiBjbGFzcz0nbWFyayBjb3VudGVyJyB0aXRsZT0nTWVzc2FnZSBjb3VudGVyJz4wPC9zcGFuPlwiKVxyXG4gICAgICAgICAgICAgICAgLmFwcGVuZFRvKGhlYWRlcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLiRyZXRhaW5NYXJrID0gJChcIjxzcGFuIGNsYXNzPSdtYXJrIHJldGFpbicgdGl0bGU9J1JldGFpbiBtZXNzYWdlJz5SPC9zcGFuPlwiKVxyXG4gICAgICAgICAgICAuYXBwZW5kVG8oaGVhZGVyKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcW9zTWFyayA9ICQoXCI8c3BhbiBjbGFzcz0nbWFyayBxb3MnIHRpdGxlPSdSZWNlaXZlZCBtZXNzYWdlIFFvUyc+UW9TPC9zcGFuPlwiKVxyXG4gICAgICAgICAgICAuYXBwZW5kVG8oaGVhZGVyKTtcclxuXHJcbiAgICAgICAgdGhpcy4kcGF5bG9hZCA9ICQoXCI8cD5cIikuYXBwZW5kVG8odGhpcy4kcm9vdCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IGlzUmV0YWluZWQodmFsdWUpIHtcclxuICAgICAgICB0aGlzLiRyZXRhaW5NYXJrW3ZhbHVlID8gJ3Nob3cnIDogJ2hpZGUnXSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBpc1N5c3RlbVBheWxvYWQodmFsdWUpIHtcclxuICAgICAgICB0aGlzLiRwYXlsb2FkLnRvZ2dsZUNsYXNzKFwic3lzXCIsIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBoaWdobGlnaHQobGluZSA9IGZhbHNlKSB7XHJcbiAgICAgICAgKGxpbmUgPyB0aGlzLiRyb290IDogdGhpcy4kcGF5bG9hZClcclxuICAgICAgICAgICAgLnN0b3AoKVxyXG4gICAgICAgICAgICAuY3NzKHtiYWNrZ3JvdW5kQ29sb3I6IFwiIzBDQjBGRlwifSlcclxuICAgICAgICAgICAgLmFuaW1hdGUoe2JhY2tncm91bmRDb2xvcjogXCIjZmZmXCJ9LCAyMDAwKTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUocGF5bG9hZCwgcmV0YWluZWQsIHFvcywgYmluYXJ5KSB7XHJcbiAgICAgICAgdGhpcy5jb3VudGVyICsrO1xyXG4gICAgICAgIHRoaXMuaXNSZXRhaW5lZCA9IHJldGFpbmVkO1xyXG5cclxuICAgICAgICBpZiAodGhpcy4kY291bnRlck1hcmspIHtcclxuICAgICAgICAgICAgdGhpcy4kY291bnRlck1hcmsudGV4dCh0aGlzLmNvdW50ZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy4kcW9zTWFyaykge1xyXG4gICAgICAgICAgICBpZiAocW9zID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRxb3NNYXJrLmhpZGUoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJHFvc01hcmsuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kcW9zTWFyay50ZXh0KGBRb1MgJHtxb3N9YCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRxb3NNYXJrLmF0dHIoXCJkYXRhLXFvc1wiLCBxb3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYmluYXJ5KSBcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHBheWxvYWQgPSBcIkhFWDogXCIgKyBmb3JtYXRCeXRlQXJyYXkocGF5bG9hZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNTeXN0ZW1QYXlsb2FkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKHBheWxvYWQgPT09IFwiXCIpIFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBwYXlsb2FkID0gXCJOVUxMXCI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU3lzdGVtUGF5bG9hZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU3lzdGVtUGF5bG9hZCA9IGZhbHNlOyAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy4kcGF5bG9hZC50ZXh0KHBheWxvYWQpO1xyXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0KHRoaXMuaXNOZXcpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc05ldykge1xyXG4gICAgICAgICAgICB0aGlzLmlzTmV3ID0gZmFsc2U7XHJcbiAgICAgICAgfSAgICAgICBcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VDb250YWluZXIge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCRwYXJlbnQpIHtcclxuICAgICAgICB0aGlzLnNvcnQgPSAnQWxwaGFiZXRpY2FsbHknO1xyXG4gICAgICAgIHRoaXMuJHBhcmVudCA9ICRwYXJlbnQ7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQoKSB7XHJcbiAgICAgICAgdGhpcy5saW5lcyA9IHt9O1xyXG4gICAgICAgIHRoaXMudG9waWNzID0gW107XHJcbiAgICAgICAgdGhpcy4kcGFyZW50Lmh0bWwoXCJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICh0b3BpYywgcGF5bG9hZCwgcmV0YWluZWQsIHFvcywgYmluYXJ5KSB7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5saW5lc1t0b3BpY10pIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBsaW5lID0gbmV3IE1lc3NhZ2VMaW5lKHRvcGljLCB0aGlzLiRwYXJlbnQpO1xyXG5cclxuICAgICAgICAgICAgdGhpc1tgYWRkTGluZSR7dGhpcy5zb3J0fWBdKGxpbmUpO1xyXG4gICAgICAgICAgICB0aGlzLmxpbmVzW3RvcGljXSA9IGxpbmU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxpbmVzW3RvcGljXS51cGRhdGUocGF5bG9hZCwgcmV0YWluZWQsIHFvcywgYmluYXJ5KTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRMaW5lQWxwaGFiZXRpY2FsbHkgKGxpbmUpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMudG9waWNzLmxlbmd0aCA9PT0gMCkgXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmFkZExpbmVDaHJvbm9sb2dpY2FsbHkobGluZSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB0b3BpYyA9IGxpbmUudG9waWM7XHJcblxyXG4gICAgICAgIHRoaXMudG9waWNzLnB1c2godG9waWMpO1xyXG4gICAgICAgIHRoaXMudG9waWNzLnNvcnQoKTtcclxuXHJcbiAgICAgICAgdmFyIG4gPSB0aGlzLnRvcGljcy5pbmRleE9mKHRvcGljKTtcclxuXHJcbiAgICAgICAgaWYgKG4gPT09IDApe1xyXG4gICAgICAgICAgICB0aGlzLiRwYXJlbnQucHJlcGVuZChsaW5lLiRyb290KTtcclxuICAgICAgICAgICAgcmV0dXJuOyAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwcmV2ID0gdGhpcy50b3BpY3NbbiAtIDFdO1xyXG4gICAgICAgIGxpbmUuJHJvb3QuaW5zZXJ0QWZ0ZXIodGhpcy5saW5lc1twcmV2XS4kcm9vdCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkTGluZUNocm9ub2xvZ2ljYWxseSAobGluZSkge1xyXG4gICAgICAgIHRoaXMudG9waWNzLnB1c2gobGluZS50b3BpYyk7XHJcbiAgICAgICAgdGhpcy4kcGFyZW50LmFwcGVuZChsaW5lLiRyb290KTtcclxuICAgIH1cclxufVxyXG5cclxuTWVzc2FnZUNvbnRhaW5lci5TT1JUX0FQTEhBID0gXCJBbHBoYWJldGljYWxseVwiO1xyXG5NZXNzYWdlQ29udGFpbmVyLlNPUlRfQ0hST05PID0gXCJDaHJvbm9sb2dpY2FsbHlcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGb290ZXIge1xyXG5cclxuICAgIHNldCBjbGllbnRJZCh2YWx1ZSkge1xyXG4gICAgICAgICQoXCIjc3RhdHVzLWNsaWVudFwiKS50ZXh0KHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgdXJpKHZhbHVlKSB7XHJcbiAgICAgICAgJChcIiNzdGF0dXMtaG9zdFwiKS50ZXh0KHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQgc3RhdGUodmFsdWUpIHtcclxuICAgICAgICBsZXQgdGV4dCwgY2xhc3NOYW1lO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgV2FsbENsaWVudC5TVEFURS5ORVc6XHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZSA9IFwiY29ubmVjdGluZ1wiO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgV2FsbENsaWVudC5TVEFURS5DT05ORUNUSU5HOlxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IFwiY29ubmVjdGluZy4uLlwiO1xyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lID0gXCJjb25uZWN0aW5nXCI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBXYWxsQ2xpZW50LlNUQVRFLkNPTk5FQ1RFRDpcclxuICAgICAgICAgICAgICAgIHRleHQgPSBcImNvbm5lY3RlZFwiO1xyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lID0gXCJjb25uZWN0ZWRcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFdhbGxDbGllbnQuU1RBVEUuUkVDT05ORUNUSU5HOlxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IFwicmVjb25uZWN0aW5nLi4uXCI7XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWUgPSBcImNvbm5lY3RpbmdcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFdhbGxDbGllbnQuU1RBVEUuRVJST1I6XHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gXCJub3QgY29ubmVjdGVkXCI7XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWUgPSBcImZhaWxcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBXYWxsQ2xpZW50LlNUQVRFXCIpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5yZWNvbm5lY3RBdHRlbXB0cyA+IDEpIHtcclxuICAgICAgICAgICAgdGV4dCArPSBgICgke3RoaXMucmVjb25uZWN0QXR0ZW1wdHN9KWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAkKFwiI3N0YXR1cy1zdGF0ZVwiKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKGNsYXNzTmFtZSk7XHJcbiAgICAgICAgJChcIiNzdGF0dXMtc3RhdGUgc3BhblwiKS50ZXh0KHRleHQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVG9vbGJhciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblxyXG4gICAgY29uc3RydWN0b3IgKHBhcmVudCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy4kcGFyZW50ID0gcGFyZW50O1xyXG4gICAgICAgIHRoaXMuJHRvcGljID0gcGFyZW50LmZpbmQoXCIjdG9waWNcIik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5pbml0RXZlbnRIYW5kbGVycygpO1xyXG4gICAgICAgIHRoaXMuaW5pdERlZmF1bHRUb3BpYygpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXRFdmVudEhhbmRsZXJzICgpIHtcclxuICAgICAgICBsZXQgaW5oaWJpdG9yID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuJHRvcGljLmtleXVwKChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGUud2hpY2ggPT09IDEzKSB7IC8vIEVOVEVSXHJcbiAgICAgICAgICAgICAgICB0aGlzLiR0b3BpYy5ibHVyKCk7XHJcbiAgICAgICAgICAgIH0gIFxyXG5cclxuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMjcpIHsgLy8gRVNDXHJcbiAgICAgICAgICAgICAgICBpbmhpYml0b3IgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kdG9waWMuYmx1cigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuJHRvcGljLmZvY3VzKChlKSA9PiB7XHJcbiAgICAgICAgICAgIGluaGliaXRvciA9IGZhbHNlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLiR0b3BpYy5ibHVyKChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChpbmhpYml0b3IpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVWkoKTsgLy8gcmV2ZXJ0IGNoYW5nZXNcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRDaGFuZ2VkKCk7XHJcbiAgICAgICAgICAgIH0gXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5wdXRDaGFuZ2VkICgpIHtcclxuICAgICAgICB2YXIgbmV3VG9waWMgPSB0aGlzLiR0b3BpYy52YWwoKTsgXHJcblxyXG4gICAgICAgIGlmIChuZXdUb3BpYyA9PT0gdGhpcy5fdG9waWMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fdG9waWMgPSBuZXdUb3BpYztcclxuICAgICAgICB0aGlzLmVtaXQoXCJ0b3BpY1wiLCBuZXdUb3BpYyk7XHJcbiAgICB9IFxyXG5cclxuICAgIGluaXREZWZhdWx0VG9waWMgKCkge1xyXG4gICAgICAgIC8vIFVSTCBoYXNoIFxyXG4gICAgICAgIGlmIChsb2NhdGlvbi5oYXNoICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3RvcGljID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fdG9waWMgPSBjb25maWcuZGVmYXVsdFRvcGljIHx8IFwiLyNcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlVWkoKTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVVaSAoKSB7XHJcbiAgICAgICAgdGhpcy4kdG9waWMudmFsKHRoaXMuX3RvcGljKTtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgdG9waWMgKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b3BpYztcclxuICAgIH1cclxuXHJcbiAgICBzZXQgdG9waWMgKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5fdG9waWMgPSB2YWx1ZTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVVpKCk7XHJcbiAgICAgICAgdGhpcy5lbWl0KFwidG9waWNcIiwgdmFsdWUpO1xyXG4gICAgfVxyXG59IiwiLyoqXHJcbiAqIFNpbXBsZSB2ZXJzaW9uIG9mIG5vZGUuanMncyBFdmVudEVtaXRlciBjbGFzc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEV2ZW50RW1pdHRlciB7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogQWRkIGV2ZW50IGhhbmRsZXIgb2YgZ2l2ZW50IHR5cGVcclxuICAgICAqL1xyXG4gICAgb24gKHR5cGUsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXNbJ19vbicgKyB0eXBlXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXNbJ19vbicgKyB0eXBlXSA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc1snX29uJyArIHR5cGVdLnB1c2goZm4pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRW1pdCBldmVudCBvZiB0eXBlLlxyXG4gICAgICogXHJcbiAgICAgKiBBbGwgYXJndW1lbnRzIHdpbGwgYmUgYXBwbGF5IHRvIGNhbGxiYWNrLCBwcmVzZXJ2ZSBjb250ZXh0IG9mIG9iamVjdCB0aGlzLlxyXG4gICAgICovXHJcbiAgICBlbWl0ICh0eXBlLCAuLi5hcmdzKSB7XHJcbiAgICAgICAgaWYgKHRoaXNbJ19vbicgKyB0eXBlXSkge1xyXG4gICAgICAgICAgICB0aGlzWydfb24nICsgdHlwZV0uZm9yRWFjaCgoZm4pID0+IGZuLmFwcGx5KHRoaXMsIGFyZ3MpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0gXHJcbiIsImltcG9ydCB7V2FsbENsaWVudH0gZnJvbSAnLi9jbGllbnQuanMnO1xyXG5pbXBvcnQge1VJLCBNZXNzYWdlTGluZSwgTWVzc2FnZUNvbnRhaW5lciwgRm9vdGVyLCBUb29sYmFyfSBmcm9tIFwiLi91aS5qc1wiO1xyXG5cclxuLy8gLS0tIE1haW4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuLy8gZGVjb2RlIHBhc3N3b3JkIGJhc2U2NCAoaWYgZW1wdHkgbGV2ZSBpdClcclxubGV0IHBhc3N3b3JkID0gY29uZmlnLnNlcnZlci5wYXNzd29yZCAhPT0gdW5kZWZpbmVkID8gYXRvYihjb25maWcuc2VydmVyLnBhc3N3b3JkKSA6IHVuZGVmaW5lZDtcclxuXHJcbmxldCBjbGllbnQgPSBuZXcgV2FsbENsaWVudChjb25maWcuc2VydmVyLnVyaSwgY29uZmlnLnNlcnZlci51c2VybmFtZSwgcGFzc3dvcmQsIGNvbmZpZy5xb3MpO1xyXG5sZXQgbWVzc2FnZXMgPSBuZXcgTWVzc2FnZUNvbnRhaW5lcigkKFwic2VjdGlvbi5tZXNzYWdlc1wiKSk7XHJcbmxldCBmb290ZXIgPSBuZXcgRm9vdGVyKCk7XHJcbmxldCB0b29sYmFyID0gbmV3IFRvb2xiYXIoJChcIiNoZWFkZXJcIikpO1xyXG5cclxubWVzc2FnZXMuc29ydCA9IGNvbmZpZy5hbHBoYWJldGljYWxTb3J0ID8gTWVzc2FnZUNvbnRhaW5lci5TT1JUX0FQTEhBIDogTWVzc2FnZUNvbnRhaW5lci5TT1JUX0NIUk9OTztcclxuXHJcbmZvb3Rlci5jbGllbnRJZCA9IGNsaWVudC5jbGllbnRJZDtcclxuZm9vdGVyLnVyaSA9IGNsaWVudC50b1N0cmluZygpO1xyXG5mb290ZXIuc3RhdGUgPSAwO1xyXG5cclxuZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgIGxldCB0b3BpYyA9IHRvb2xiYXIudG9waWM7XHJcblxyXG4gICAgY2xpZW50LnN1YnNjcmliZSh0b3BpYywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIFVJLnNldFRpdGxlKHRvcGljKTtcclxuICAgICAgICBsb2NhdGlvbi5oYXNoID0gXCIjXCIgKyB0b3BpYztcclxuICAgIH0pO1xyXG5cclxuICAgIG1lc3NhZ2VzLnJlc2V0KCk7XHJcbn1cclxuXHJcbnRvb2xiYXIub24oXCJ0b3BpY1wiLCAoKSA9PiB7XHJcbiAgICBsb2FkKCk7XHJcbn0pO1xyXG5cclxuY2xpZW50Lm9uQ29ubmVjdGVkID0gKCkgPT4ge1xyXG4gICAgbG9hZCgpO1xyXG4gICAgVUkudG9hc3QoXCJDb25uZWN0ZWQgdG8gaG9zdCBcIiArIGNsaWVudC50b1N0cmluZygpKTtcclxufTtcclxuXHJcbmNsaWVudC5vbkVycm9yID0gKGRlc2NyaXB0aW9uLCBpc0ZhdGFsKSA9PiB7XHJcbiAgICBVSS50b2FzdChkZXNjcmlwdGlvbiwgXCJlcnJvclwiLCBpc0ZhdGFsKTtcclxufTtcclxuXHJcbmxldCByZWNvbm5lY3RpbmdUb2FzdCA9IG51bGw7XHJcblxyXG5jbGllbnQub25TdGF0ZUNoYW5nZWQgPSAoc3RhdGUpID0+IHtcclxuICAgIGZvb3Rlci5yZWNvbm5lY3RBdHRlbXB0cyA9IGNsaWVudC5hdHRlbXB0cztcclxuICAgIGZvb3Rlci5zdGF0ZSA9IHN0YXRlO1xyXG5cclxuICAgIGlmICgoc3RhdGUgPT09IFdhbGxDbGllbnQuU1RBVEUuQ09OTkVDVElORyB8fCBzdGF0ZSA9PT0gV2FsbENsaWVudC5TVEFURS5SRUNPTk5FQ1RJTkcpICYmIGNsaWVudC5hdHRlbXB0cyA+PSAyKSB7XHJcbiAgICAgICAgbGV0IG1zZyA9IHN0YXRlID09PSBXYWxsQ2xpZW50LlNUQVRFLkNPTk5FQ1RJTkcgP1xyXG4gICAgICAgICAgICBgRmFpbCB0byBjb25uZWN0LiBUcnlpbmcgdG8gY29ubmVjdC4uLiAoJHtjbGllbnQuYXR0ZW1wdHN9IGF0dGVtcHRzKWA6XHJcbiAgICAgICAgICAgIGBDb25uZWN0aW9uIGxvc3QuIFRyeWluZyB0byByZWNvbm5lY3QuLi4gKCR7Y2xpZW50LmF0dGVtcHRzfSBhdHRlbXB0cylgO1xyXG5cclxuICAgICAgICBpZiAocmVjb25uZWN0aW5nVG9hc3QgPT09IG51bGwpe1xyXG4gICAgICAgICAgICByZWNvbm5lY3RpbmdUb2FzdCA9IFVJLnRvYXN0KG1zZywgXCJlcnJvclwiLCB0cnVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZWNvbm5lY3RpbmdUb2FzdC5zZXRNZXNzYWdlKG1zZyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdGF0ZSA9PT0gV2FsbENsaWVudC5TVEFURS5DT05ORUNURUQgJiYgcmVjb25uZWN0aW5nVG9hc3QgIT09IG51bGwpIHtcclxuICAgICAgICByZWNvbm5lY3RpbmdUb2FzdC5oaWRlKCk7XHJcbiAgICAgICAgcmVjb25uZWN0aW5nVG9hc3QgPSBudWxsO1xyXG5cclxuICAgICAgICBpZiAoY2xpZW50LmZpcnN0Q29ubmVjdGlvbiA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgVUkudG9hc3QoXCJSZWNvbm5lY3RlZFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5jbGllbnQub25NZXNzYWdlID0gKHRvcGljLCBtc2csIHJldGFpbmVkLCBxb3MsIGJpbmFyeSkgPT4ge1xyXG4gICAgbWVzc2FnZXMudXBkYXRlKHRvcGljLCBtc2csIHJldGFpbmVkLCBxb3MsIGJpbmFyeSk7XHJcbn07XHJcblxyXG5jbGllbnQuY29ubmVjdCgpO1xyXG4iXX0=
