#!/bin/sh
set -xe

export MQTT_URI=${MQTT_URI:="ws://localhost:1884/"}

node_modules/grunt/bin/grunt dist
# WORKAROUND start the ws proxy
(sleep 2 && wget -t 1 http://localhost:5000/ws) &
npm start
