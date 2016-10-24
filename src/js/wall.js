import {WallClient} from './client.js';
import {UI, MessageLine, MessageContainer, Footer} from "./ui.js";

// --- Main -------------------------------------------------------------------

var client = new WallClient(config.server.host, config.server.port, config.server.path);
var messages = new MessageContainer($("section.messages"));
var footer = new Footer();

footer.clientId = client.clientId;
footer.host = client.toString();
footer.state = 0;

function load() {
    var topic = $("#topic").val();

    client.subscribe(topic, function () {
        UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    messages.reset();
}

client.onConnected = () => {
    load();
    footer.state = 1;
    UI.toast("Connected to host " + client.toString());
};

client.onError = (description, isFatal) => {
    UI.toast(description, "error", isFatal);

    if (isFatal) {
        footer.state = 2;
    }
};

client.onMessage = (topic, msg, retained) => {
    messages.update(topic, msg, retained);
};

$("#topic").keypress(function(e) {
    if(e.which === 13) {
        load();
    }
});

// URL hash 
if (location.hash !== "") {
    $("#topic").val(location.hash.substr(1));
} else {
    $("#topic").val(config.defaultTopic);
}
