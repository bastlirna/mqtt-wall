export var UI = {};

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


export class MessageLine {

    constructor(topic, $parent){
        this.topic = topic;
        this.counter = 0;
        this.$parent = $parent;
        this.init();
    }

    init() {
        this.$root = $("<article class='message'>");

        var header = $("<header>").appendTo(this.$root);

        $("<h2>")
            .text(this.topic)
            .appendTo(header);

        if (window.config.showCounter) {
            this.$counterMark = $("<span class='mark counter' title='Message counter'>0</span>")
                .appendTo(header);
        }

        this.$retainMark = $("<span class='mark retain' title='Retain message'>R</span>")
            .appendTo(header);

        this.$payload = $("<p>").appendTo(this.$root);
        
        this.$root.appendTo(this.$parent);
    }

    set isRetained(value) {
        this.$retainMark[value ? 'show' : 'hide']();
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
        this.counter ++;
        this.isRetained = retained;

        if (this.$counterMark) {
            this.$counterMark.text(this.counter);
        }
        
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

export class MessageContainer {
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

        if (!this.lines[topic]) {
            this.lines[topic] = new MessageLine(topic, this.$parent);
        }

        this.lines[topic].update(payload, retained);
    }
}

export class Footer {

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