// --- Application objects ----------------------------------------------------

class WallClient {

    constructor(host, port, path) {
        
        this.clientId = "wall-" + new Date().getTime();
        
        var client = new Paho.MQTT.Client(host, port, path, this.clientId);
        var connectOptions = {};

        client.onMessageArrived = (message) => {
            //console.log("Message arrived ", message);
            this.onMessage(message.destinationName, message.payloadString, message.retained);
        };

        client.onConnectionLost = (error) => {
            console.info("Connection lost ", error);
            this.onError(`Connection lost (${error.errorMessage})`, true);
        }

        connectOptions.onSuccess = () => {
            console.info("Connect success");
            this.onConnected();
        }

        connectOptions.onFailure = (error) => {
            console.error("Connect fail ", error);
            this.onError("Fail to connect", true);
        }

        client.connect(connectOptions);

        this.client = client;
        this.currentTopic = null;

        this.onConnected = $.noop();
        this.onMessage = $.noop();
        this.onError = $.noop();
    }

    subscribe (topic, fn) {
    
        // unsubscribe current topic (if exists)
        if (this.currentTopic !== null) {
            var oldTopic = this.currentTopic;
            this.client.unsubscribe(oldTopic, {
                onSuccess: () => {
                    console.info("Unsubscribe '%s' success", oldTopic);
                },
                onFailure: (error) => {
                    console.error("Unsubscribe '%s' failure", oldTopic, error);
                },
            });
        }
    
        // subscribe new topic
        this.client.subscribe(topic, {
            onSuccess: (r) => {
                console.info("Subscribe '%s' success", topic, r);
                fn();
            },
            onFailure: (r) => {
                console.error("subscribe '%s' failure", topic, r);
                this.onError("Subscribe failure");
            }
        });

        this.currentTopic = topic;
    }

    toString () {
        var str = this.client.host;

        if (this.client.port != 80) {
            str += ":" + this.client.port;
        }

        return str;
    }
}

// --- UI ---------------------------------------------------------------------


var UI = {};

UI.setTitle = function (topic) {
    document.title = "MQTT Wall" + (topic ? (" for " + topic) : "");
};
 
UI.toast = function (message, type = "info", persistent = false) {
    var toast = $("<div class='toast-item'>")
        .text(message)
        .addClass(type)
        .hide()
        .appendTo("#toast")
        .fadeIn();

    if (persistent != true) {
        toast.delay(5000).slideUp().queue(function () { this.remove(); });
    } else {
        $("<span> – <a href='javascript:;'>reload</a></span>")
            .find("a").click(function () { location.reload(); }).end()
            .appendTo(toast);
    }
};

class MessageLine {

    constructor(topic, $parent){
        this.topic = topic;
        this.$parent = $parent;
        this.init();
    }

    init() {
        this.$root = $("<div class='message'>");

        $("<h2>")
            .text(this.topic)
            .appendTo(this.$root);

        this.$payload = $("<p>").appendTo(this.$root);
        
        this.$root.appendTo(this.$parent);
    }

    set isRetained(value) {
        this.$root.toggleClass("r", value);
    }

    set isSystemPayload(value) {
        this.$payload.toggleClass("sys", value);
    }

    highlight() {
        this.$payload
            .stop()
            .css({backgroundColor: "#0CB0FF"})
            .animate({backgroundColor: "#fff"}, 2000);
    }

    update(payload, retained) {
        
        this.isRetained = retained;
        
        if (payload == "") 
        {
            payload = "NULL";
            this.isSystemPayload = true;
        }
        else
        {
            this.isSystemPayload = false;    
        }

        this.$payload.text(payload);
        this.highlight();       
    }
}

class MessageContainer {
    constructor($parent) {
        this.$parent = $parent;
        this.init();
    }

    init() {
        this.reset();
    }

    reset() {
        this.lines = {};
        this.$parent.html("");
    }

    update (topic, payload, retained) {

        if (this.lines[topic] === undefined) {
            this.lines[topic] = new MessageLine(topic, this.$parent);
        }

        this.lines[topic].update(payload, retained);
    }
}

class Footer {

    set clientId(value) {
        $("#status-client").text(value);
    }

    set host(value) {
        $("#status-host").text("ws://" + value);
    }

    set state(value) {
        var className = ["connecting", "connected", "fail"];
        var text = ["connecting...", "connected", "not connected"];

        $("#status-state").removeClass().addClass(className[value]);
        $("#status-state span").text(text[value]);
    }
}

// --- Main -------------------------------------------------------------------


var client = new WallClient(config.server.host, config.server.port, config.server.path);
var messages = new MessageContainer($("#messages"));
var footer = new Footer();

footer.clientId = client.clientId;
footer.host = client.toString();
footer.state = 0;

client.onConnected = () => {
    load();
    footer.state = 1;
    UI.toast("Connected to host " + client.toString());
}

client.onError = (description, isFatal) => {
    UI.toast(description, "error", isFatal);

    if (isFatal) footer.state = 2;
}

client.onMessage = (topic, msg, retained) => {
    messages.update(topic, msg, retained);
}

function load() {
    var topic = $("#topic").val();

    client.subscribe(topic, function () {
        UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    messages.reset();
}

$("#topic").keypress(function(e) {
    if(e.which == 13) {
        load();
    }
});

// URL hash 
if (location.hash != "") {
    $("#topic").val(location.hash.substr(1));
} else {
    $("#topic").val(config.defaultTopic);
}
