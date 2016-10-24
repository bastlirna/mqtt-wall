export class WallClient {

    constructor(host, port, path) {
        
        this.clientId = WallClient.generateClientId();
        
        var client = new Paho.MQTT.Client(host, port, path, this.clientId);
        var connectOptions = {};

        client.onMessageArrived = (message) => {
            //console.log("Message arrived ", message);
            this.onMessage(message.destinationName, message.payloadString, message.retained);
        };

        client.onConnectionLost = (error) => {
            console.info("Connection lost ", error);
            this.onError(`Connection lost (${error.errorMessage})`, true);
        };

        connectOptions.onSuccess = () => {
            console.info("Connect success");
            this.onConnected();
        };

        connectOptions.onFailure = (error) => {
            console.error("Connect fail ", error);
            this.onError("Fail to connect", true);
        };

        client.connect(connectOptions);

        this.client = client;
        this.currentTopic = null;

        this.onConnected = $.noop();
        this.onMessage = $.noop();
        this.onError = $.noop();
    }

    static generateClientId() {
        var time = Date.now() % 1000;
        var rnd = Math.round(Math.random() * 1000);
        return `wall-${time*1000 + rnd}`;
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
                }
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

        if (this.client.path != "") {
            str += "" + this.client.path;
        } 

        return str;
    }
}