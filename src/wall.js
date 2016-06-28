var topicName;
var topics = {};
var titlePrefix = "MQTT Wall";


// --- Application objects ----------------------------------------------------


function WallClient(host, port, path)
{
    var that = this;
    var clientId = "wall-" + new Date().getTime();
    var client = new Paho.MQTT.Client(host, port, path, clientId);
    var connectOptions = {};

    client.onMessageArrived = function (message) {
        //console.log("Message arrived ", message);
        that.onMessage(message.destinationName, message.payloadString, message.retained);
    };

    client.onConnectionLost = function (error) {
        console.info("Connection lost ", error);
        that.onError(`Connection lost (${error.errorMessage})`, true);
    }

    connectOptions.onSuccess = function () {
        console.info("Connect success");
        that.onConnected();
    }

    connectOptions.onFailure = function (error) {
        console.error("Connect fail ", error);
        that.onError("Fail to connect", true);
    }

    client.connect(connectOptions);

    this._client = client;
    this.currentTopic = null;
}

// events
WallClient.prototype.onConnected = $.noop();
WallClient.prototype.onMessage = $.noop();
WallClient.prototype.onError = $.noop();

WallClient.prototype.subscribe = function (topic, fn) {
    var that = this;

    // unsubscribe current topic (if exists)
    if (this.currentTopic !== null) {
        var oldTopic = this.currentTopic;
        this._client.unsubscribe(oldTopic, {
            onSuccess: function(){
                console.info("Unsubscribe '%s' success", oldTopic);
            },
            onFailure: function(error){
                console.error("Unsubscribe '%s' failure", oldTopic, error);
            },
        });
    }
  
    // subscribe new topic
    that._client.subscribe(topic, {
        onSuccess: function (r) {
            console.info("Subscribe '%s' success", topic, r);
            fn();
        },
        onFailure: function (r) {
            console.error("subscribe '%s' failure", topic, r);
            that.onError("Subscribe failure");
        }
    });

    that.currentTopic = topic;
};

WallClient.prototype.toString = function () {
    return this._client.host;
}


// --- UI ---------------------------------------------------------------------


var UI = {};

UI.setTitle = function (topic) {
    document.title = "MQTT Wall" + (topic ? (" for " + topic) : "");
}

UI.toast = function (message, type, persistent) {
    var toast = $("<div class='toast-item'>")
        .text(message)
        .addClass(type || "info")
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
}

UI.printMsg = function (topic, msg, retained) {
    var line = topics[topic];

    if (line == undefined) // new message
    {
        line = {};
        line.div = $("<div class='message'>");

        $("<h2>")
            .text(topic)
            .appendTo(line.div);

        line.msg = $("<p>").appendTo(line.div);
        
        line.div.appendTo("#messages");
        topics[topic] = line;
    }

    if(retained)
    {
        line.div.addClass("r")
    }
    else
    {
        line.div.removeClass("r")   
    }

    if (msg == "") 
    {
        msg = "NULL";
        line.msg.addClass("sys");
    }
    else
    {
        line.msg.removeClass("sys");    
    }

    line.msg.text(msg);

    line.msg
        .stop()
        .css({backgroundColor: "#0CB0FF"})
        .animate({backgroundColor: "#fff"}, 2000 );
}


// --- Main -------------------------------------------------------------------


var client = new WallClient(config.server.host, config.server.port, config.server.path);

client.onConnected = function () {
    load();
    UI.toast("Connected to " + client.toString());
}

client.onError = function (description, isFatal) {
    UI.toast(description, "error", isFatal);
}

client.onMessage = function (topic, msg, retained) {
    UI.printMsg(topic, msg, retained);
}

function load() {
    var topic = $("#topic").val();

    client.subscribe(topic, function () {
        UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    // clean old messages
    topics = {};
    $("#messages").html("");
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
