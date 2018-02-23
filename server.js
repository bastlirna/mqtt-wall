var express = require('express');
var proxy = require('http-proxy-middleware');
var morgan = require('morgan')

var mqtt_uri = process.env.MQTT_URI

var app = express();

app.use(morgan('combined'))

app.use('/ws', proxy(mqtt_uri, { ws: true }));

app.use(express.static('dist/'))

console.log("Listening on 5000...")
app.listen(5000);
