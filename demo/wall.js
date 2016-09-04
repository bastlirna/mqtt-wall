"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// --- Application objects ----------------------------------------------------

var WallClient = function () {
    function WallClient(host, port, path) {
        var _this = this;

        _classCallCheck(this, WallClient);

        this.clientId = WallClient.generateClientId();

        var client = new Paho.MQTT.Client(host, port, path, this.clientId);
        var connectOptions = {};

        client.onMessageArrived = function (message) {
            //console.log("Message arrived ", message);
            _this.onMessage(message.destinationName, message.payloadString, message.retained);
        };

        client.onConnectionLost = function (error) {
            console.info("Connection lost ", error);
            _this.onError("Connection lost (" + error.errorMessage + ")", true);
        };

        connectOptions.onSuccess = function () {
            console.info("Connect success");
            _this.onConnected();
        };

        connectOptions.onFailure = function (error) {
            console.error("Connect fail ", error);
            _this.onError("Fail to connect", true);
        };

        client.connect(connectOptions);

        this.client = client;
        this.currentTopic = null;

        this.onConnected = $.noop();
        this.onMessage = $.noop();
        this.onError = $.noop();
    }

    _createClass(WallClient, [{
        key: "subscribe",
        value: function subscribe(topic, fn) {
            var _this2 = this;

            // unsubscribe current topic (if exists)
            if (this.currentTopic !== null) {
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
                onSuccess: function onSuccess(r) {
                    console.info("Subscribe '%s' success", topic, r);
                    fn();
                },
                onFailure: function onFailure(r) {
                    console.error("subscribe '%s' failure", topic, r);
                    _this2.onError("Subscribe failure");
                }
            });

            this.currentTopic = topic;
        }
    }, {
        key: "toString",
        value: function toString() {
            var str = this.client.host;

            if (this.client.port != 80) {
                str += ":" + this.client.port;
            }

            if (this.client.path != "") {
                str += "" + this.client.path;
            }

            return str;
        }
    }], [{
        key: "generateClientId",
        value: function generateClientId() {
            var time = Date.now() % 1000;
            var rnd = Math.round(Math.random() * 1000);
            return "wall-" + (time * 1000 + rnd);
        }
    }]);

    return WallClient;
}();

// --- UI ---------------------------------------------------------------------


var UI = {};

UI.setTitle = function (topic) {
    document.title = "MQTT Wall" + (topic ? " for " + topic : "");
};

UI.toast = function (message) {
    var type = arguments.length <= 1 || arguments[1] === undefined ? "info" : arguments[1];
    var persistent = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

    var toast = $("<div class='toast-item'>").text(message).addClass(type).hide().appendTo("#toast").fadeIn();

    if (persistent != true) {
        toast.delay(5000).slideUp().queue(function () {
            this.remove();
        });
    } else {
        $("<span> – <a href='javascript:;'>reload</a></span>").find("a").click(function () {
            location.reload();
        }).end().appendTo(toast);
    }
};

var MessageLine = function () {
    function MessageLine(topic, $parent) {
        _classCallCheck(this, MessageLine);

        this.topic = topic;
        this.counter = 0;
        this.$parent = $parent;
        this.init();
    }

    _createClass(MessageLine, [{
        key: "init",
        value: function init() {
            this.$root = $("<article class='message'>");

            var header = $("<header>").appendTo(this.$root);

            $("<h2>").text(this.topic).appendTo(header);

            if (window.config.showCounter) {
                this.$counterMark = $("<span class='mark counter' title='Message counter'>0</span>").appendTo(header);
            }

            this.$retainMark = $("<span class='mark retain' title='Retain message'>R</span>").appendTo(header);

            this.$payload = $("<p>").appendTo(this.$root);

            this.$root.appendTo(this.$parent);
        }
    }, {
        key: "highlight",
        value: function highlight() {
            this.$payload.stop().css({ backgroundColor: "#0CB0FF" }).animate({ backgroundColor: "#fff" }, 2000);
        }
    }, {
        key: "update",
        value: function update(payload, retained) {
            this.counter++;
            this.isRetained = retained;

            if (this.$counterMark) {
                this.$counterMark.text(this.counter);
            }

            if (payload == "") {
                payload = "NULL";
                this.isSystemPayload = true;
            } else {
                this.isSystemPayload = false;
            }

            this.$payload.text(payload);
            this.highlight();
        }
    }, {
        key: "isRetained",
        set: function set(value) {
            this.$retainMark[value ? 'show' : 'hide']();
        }
    }, {
        key: "isSystemPayload",
        set: function set(value) {
            this.$payload.toggleClass("sys", value);
        }
    }]);

    return MessageLine;
}();

var MessageContainer = function () {
    function MessageContainer($parent) {
        _classCallCheck(this, MessageContainer);

        this.$parent = $parent;
        this.init();
    }

    _createClass(MessageContainer, [{
        key: "init",
        value: function init() {
            this.reset();
        }
    }, {
        key: "reset",
        value: function reset() {
            this.lines = {};
            this.$parent.html("");
        }
    }, {
        key: "update",
        value: function update(topic, payload, retained) {

            if (this.lines[topic] === undefined) {
                this.lines[topic] = new MessageLine(topic, this.$parent);
            }

            this.lines[topic].update(payload, retained);
        }
    }]);

    return MessageContainer;
}();

var Footer = function () {
    function Footer() {
        _classCallCheck(this, Footer);
    }

    _createClass(Footer, [{
        key: "clientId",
        set: function set(value) {
            $("#status-client").text(value);
        }
    }, {
        key: "host",
        set: function set(value) {
            $("#status-host").text("ws://" + value);
        }
    }, {
        key: "state",
        set: function set(value) {
            var className = ["connecting", "connected", "fail"];
            var text = ["connecting...", "connected", "not connected"];

            $("#status-state").removeClass().addClass(className[value]);
            $("#status-state span").text(text[value]);
        }
    }]);

    return Footer;
}();

// --- Main -------------------------------------------------------------------


var client = new WallClient(config.server.host, config.server.port, config.server.path);
var messages = new MessageContainer($("section.messages"));
var footer = new Footer();

footer.clientId = client.clientId;
footer.host = client.toString();
footer.state = 0;

client.onConnected = function () {
    load();
    footer.state = 1;
    UI.toast("Connected to host " + client.toString());
};

client.onError = function (description, isFatal) {
    UI.toast(description, "error", isFatal);

    if (isFatal) footer.state = 2;
};

client.onMessage = function (topic, msg, retained) {
    messages.update(topic, msg, retained);
};

function load() {
    var topic = $("#topic").val();

    client.subscribe(topic, function () {
        UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    messages.reset();
}

$("#topic").keypress(function (e) {
    if (e.which == 13) {
        load();
    }
});

// URL hash 
if (location.hash != "") {
    $("#topic").val(location.hash.substr(1));
} else {
    $("#topic").val(config.defaultTopic);
}
//# sourceMappingURL=wall.js.map
