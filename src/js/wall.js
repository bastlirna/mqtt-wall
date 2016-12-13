import {WallClient} from './client.js';
import {UI, MessageLine, MessageContainer, Footer, Toolbar} from "./ui.js";

// --- Main -------------------------------------------------------------------

var client = new WallClient(config.server.host, config.server.port, config.server.path);
var messages = new MessageContainer($("section.messages"));
var footer = new Footer();
var toolbar = new Toolbar($("#header"));

messages.sort = config.alphabeticalSort ? MessageContainer.SORT_APLHA : MessageContainer.SORT_CHRONO;

footer.clientId = client.clientId;
footer.host = client.toString();
footer.state = 0;

function load() {
    let topic = toolbar.topic;

    client.subscribe(topic, function () {
        UI.setTitle(topic);
        location.hash = "#" + topic;
    });

    messages.reset();
}

toolbar.on("topic", () => {
    load();
});

client.onConnected = () => {
    load();
    UI.toast("Connected to host " + client.toString());
};

client.onError = (description, isFatal) => {
    UI.toast(description, "error", isFatal);
};

let reconnectingToast = null;

client.onStateChanged = (state) => {
    footer.reconnectAttempts = client.attempts;
    footer.state = state;

    if ((state === WallClient.STATE.CONNECTING || state === WallClient.STATE.RECONNECTING) && client.attempts >= 2) {
        var msg = state === WallClient.STATE.CONNECTING ?
            `Fail to connect. Trying to connect... (${client.attempts} attempts)`:
            `Connection lost. Trying to reconnect... (${client.attempts} attempts)`;

        if (reconnectingToast === null){
            reconnectingToast = UI.toast(msg, "error", true);
        } else {
            reconnectingToast.setMessage(msg);
        }
    }

    if (state === WallClient.STATE.CONNECTED && reconnectingToast !== null) {
        reconnectingToast.hide();
        reconnectingToast = null;

        if (client.firstConnection == false) {
            UI.toast("Reconnected");
        }
    }
}

client.onMessage = (topic, msg, retained) => {
    messages.update(topic, msg, retained);
};

client.connect();
