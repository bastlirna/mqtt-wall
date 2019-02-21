var mosca = require('mosca');
 
var startTime = new Date();

var autoKickOff = true;

var requiredAuthenticate = false;

var username = "test";
var password = "pass";

var settings = {
    id: 'broker',
    stats: true,
    port: 1883,
    persistence: { factory: mosca.persistence.Memory },
    http: {
        port: 8080,
        bundle: true,
        static: './'
    }
};
 
var server = new mosca.Server(settings);
 
server.on('clientConnected', function(client) {
    console.log('CON %s', client.id);

    if (autoKickOff && client.id != "AdamHorcica_161959140") {
        setTimeout(() => {
            console.log("KICK client %s", client.id);
            client.close();
        }, 1000 + Math.random() * 5000);
    }
});
 
// fired when a message is received 
server.on('published', function(packet, client) {
    //console.log('PUB %s "%s"', packet.topic, packet.payload);
});
 
server.on('ready', setup);

server.authenticate = function (client, u, p, cb) {
    console.log("Authenticate %s, %s, %s", client.id, u, p);
    var result = false;

    if (requiredAuthenticate) {
        result = username == u && password == p;
    } else {
        result = true;
    }

    setTimeout(function () { cb(null, result); }, 0);
}

// ---

function pub (topic, msg, retain) {

    if (msg instanceof Buffer === false){
        msg = msg.toString();
    }

    var packet = {
        topic: topic,
        payload: msg,
        qos: 0,
        retain: retain || false
    };

    server.publish(packet);
}

function kickOff () {
    console.log("Kick Off");
    server.clients.forEach( (c) => {
        c.close();
    });
}

function rndPub(topic, min, max, fn) {

    function t () {
        return (max - min) * Math.random() + min;
    }

    function send() {
        pub(topic, fn());
        setTimeout(send, t());
    }

    setTimeout(send, t());
}

// fired when the mqtt server is ready 
function setup() {
    console.log('Mosca server is up and running');
    var c = 0;

    // general topics
    rndPub("/start-time", 500, 1000, () => startTime.toString());
    rndPub("/uptime", 500, 1000, () => Math.round((Date.now() - startTime) / 1000));
    rndPub("/counter", 500, 1000, () => c++);
    rndPub("/rnd", 1000, 2000, () => Math.round(Math.random() * 100));

    // text
    rndPub("/text/short", 1000, 5000, () => "Lorem ipsum");
    rndPub("/text/long", 1000, 5000, () => "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum elementum mollis ultrices. Curabitur eget libero sodales ligula mollis hendrerit at nec urna. Sed faucibus eget metus vel euismod. Nullam convallis arcu id diam facilisis, sit amet laoreet odio laoreet. Nulla tortor orci, posuere nec dapibus ac, rutrum et dolor. Cras sagittis a sapien at elementum. Etiam imperdiet justo et odio pulvinar, in ornare leo vestibulum. Ut at augue dolor. Donec vestibulum magna id pulvinar dictum. Proin magna augue, imperdiet tristique pretium ut, condimentum vel massa. Ut condimentum velit a cursus efficitur. Duis quis lobortis nisi. Praesent eu enim eget sapien malesuada ultrices. Cras quis ultrices metus. ");

    rndPub("/json/short-array", 1000, 5000, () => JSON.stringify(["aaa", "bbb", 42]));
    rndPub("/json/short-object", 1000, 5000, () => JSON.stringify({aaa: "abc", bbb: 42}));
    rndPub("/json/long-object", 1000, 5000, () => JSON.stringify({"payload":"MyAAMDE4AAA=","fields":{"payload":{"light":3,"temp":18},"text":"3 018 "},"port":127,"counter":28,"dev_eui":"000000008E69B242","metadata":[{"frequency":868.3,"datarate":"SF12BW125","codingrate":"4/5","gateway_timestamp":3420668252,"channel":1,"server_time":"2016-11-28T17:22:39.21518015Z","rssi":-115,"lsnr":-9.2,"rfchain":1,"crc":1,"modulation":"LORA","gateway_eui":"0000024B080E0539","altitude":221,"longitude":14.42204,"latitude":50.08947},{"frequency":868.3,"datarate":"SF12BW125","codingrate":"4/5","gateway_timestamp":401542396,"channel":1,"server_time":"2016-11-28T17:22:39.385729404Z","rssi":-119,"lsnr":-18.5,"rfchain":1,"crc":1,"modulation":"LORA","gateway_eui":"1DEE148A60342739","altitude":260,"longitude":14.3962,"latitude":50.08835}]}));

    // non UTF-8 data
    rndPub("/binary/non-utf", 1000, 5000, () => Buffer.from("AAAAABS2/j8g/P4/MOj7lhrg/j9Rni4vIPz+P7VIIUBw8v4/BOD+P8Dc/z+guP4/QAAAAHDy/j8AAAAAQBL/P3NCIUCw2v8/AAAAACMrIECguP4/SQ8AQLDa/z9JDwBA", "base64"))
}
