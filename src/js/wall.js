import {WallClient} from './client.js';
import {UI, MessageLine, MessageContainer, Footer, Toolbar} from "./ui.js";

// --- Main -------------------------------------------------------------------

// decode password base64 (if empty leve it)
let password = config.server.password !== undefined ? atob(config.server.password) : undefined;

let client = new WallClient(config.server.uri, config.server.username, password, config.qos);
let messages = new MessageContainer($("section.messages"));
let footer = new Footer();
let toolbar = new Toolbar($("#header"));

messages.sort = config.alphabeticalSort ? MessageContainer.SORT_APLHA : MessageContainer.SORT_CHRONO;

footer.clientId = client.clientId;
footer.uri = client.toString();
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
        let msg = state === WallClient.STATE.CONNECTING ?
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

client.onMessage = (topic, msg, retained, qos) => {
    messages.update(topic, msg, retained, qos);
};

client.connect();
