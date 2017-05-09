export class WallClient {

    constructor(uri, username, password, qos = 0) {
        
        this.username = username;
        this.password = password;
        this.qos = qos;
        this.clientId = WallClient.generateClientId();
        
        // paho documentation: http://www.eclipse.org/paho/files/jsdoc/index.html
        this.client = new Paho.MQTT.Client(uri, this.clientId);
        
        this.client.onMessageArrived = (message) => {
            //console.log("Message arrived ", message);
            this.onMessage(message.destinationName, message.payloadString, message.retained, message.qos);
        };

        this.client.onConnectionLost = (error) => {
            console.info("Connection lost ", error);
            
            if (WallClient.isNetworkError(error.errorCode)){
                this._reconnect();
                return;
            }

            this.onError(`Connection lost (${error.errorMessage})`, true);
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

    static generateClientId() {
        var time = Date.now() % 1000;
        var rnd = Math.round(Math.random() * 1000);
        return `wall${time*1000 + rnd}`;
    }

    static isNetworkError (code) {
        // possible codes: https://github.com/eclipse/paho.mqtt.javascript/blob/master/src/mqttws31.js#L166
        const networkErrors = [ 
            1 /* CONNECT_TIMEOUT */,
            2 /* SUBSCRIBE_TIMEOUT */, 
            3 /* UNSUBSCRIBE_TIMEOUT */,
            4 /* PING_TIMEOUT */,
            6 /* CONNACK_RETURNCODE */,
            7 /* SOCKET_ERROR */,
            8 /* SOCKET_CLOSE */,
            9 /* MALFORMED_UTF */,
            11 /* INVALID_STATE */,
            12 /* INVALID_TYPE */,
            15 /* INVALID_STORED_DATA */,
            16 /* INVALID_MQTT_MESSAGE_TYPE */,
            17 /* MALFORMED_UNICODE */,
        ];
        return networkErrors.indexOf(code) >= 0;
    }

    subscribe (topic, fn) {
    
        // unsubscribe current topic (if exists)
        if (this.currentTopic !== null && this.currentTopic !== topic) {
            let oldTopic = this.currentTopic;
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
            qos: this.qos,
            onSuccess: (r) => {
                console.info("Subscribe '%s' success", topic, r);
                if (fn) {
                    fn();
                }
            },
            onFailure: (r) => {
                console.error("subscribe '%s' failure", topic, r);
                this.onError("Subscribe failure");
            }
        });

        this.currentTopic = topic;
    }

    connect () {

        let connectOptions = {

            onSuccess : () => {
                console.info("Connect success");

                this.attempts = 0;
                this._setState(WallClient.STATE.CONNECTED);
                
                if (this.firstConnection) {
                    this.firstConnection = false;
                    this.onConnected();
                } else {
                    this.subscribe(this.currentTopic);
                }
            },

            onFailure : (error) => {
                console.error("Connect fail ", error);
                
                if (WallClient.isNetworkError(error.errorCode)){
                    this._reconnect();
                    return;
                }
                
                this.onError("Fail to connect", true);
            }
        };

        if (this.username && this.password) {
            connectOptions.userName = this.username;
            connectOptions.password = this.password;
        }

        this._setState(this.firstConnection ? WallClient.STATE.CONNECTING : WallClient.STATE.RECONNECTING)

        this.client.connect(connectOptions);
    }

    _reconnect () {

        this.attempts ++;
        this._setState(this.firstConnection ? WallClient.STATE.CONNECTING : WallClient.STATE.RECONNECTING);

        let t = (this.attempts-1) * 2000;
        t = Math.max(Math.min(t, 30000), 100);

        setTimeout(() => {
            this.connect();
        }, t);
    }

    _setState (state) {
        this.state = state;

        if (this.onStateChanged)
            this.onStateChanged(state);
    }

    toString () {
        // _getURI is undocumented function (it is URI used for underlying WebSocket connection)
        // see https://github.com/eclipse/paho.mqtt.javascript/blob/master/src/mqttws31.js#L1622
        return this.client._getURI();
    }
}

WallClient.STATE = {
    NEW: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    RECONNECTING: 3,
    ERROR: 99
};
