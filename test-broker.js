var mosca = require('mosca');
 
var startTime = new Date();

var settings = {
    id: 'broker',
    stats: true,
    port: 1883,

    persistence: { factory: mosca.persistence.Memory },

    http: {
        port: 3000,
        bundle: true,
        static: './'
    }
};
 
var server = new mosca.Server(settings);
 
server.on('clientConnected', function(client) {
    console.log('CON %s', client.id);
});
 
// fired when a message is received 
server.on('published', function(packet, client) {
    console.log('PUB %s "%s"', packet.topic, packet.payload);
});
 
server.on('ready', setup);

// ---

function pub (topic, msg, retain) {
    var packet = {
        topic: topic,
        payload: msg.toString(),
        qos: 0,
        retain: retain || false
    };
    server.publish(packet);
}

// fired when the mqtt server is ready 
function setup() {
    console.log('Mosca server is up and running');

    var c = 0;

    pub("/start-time", startTime.toString(), true);

    setInterval(() => {
        pub("/counter", c++);
    }, 2000 * Math.random() + 300);

    setInterval(() => {
        pub("/uptime", Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    setInterval(() => {
        pub("/rnd", Math.round(Math.random() * 100));
    }, 5000 * Math.random() + 1000);
}

