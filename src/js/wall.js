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
