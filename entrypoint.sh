#!/bin/sh
set -xe

export MQTT_SERVER=${MQTT_SERVER:="localhost"}
export MQTT_PORT=${MQTT_PORT:="1884"}


socat TCP-LISTEN:8080,reuseaddr,fork TCP:$MQTT_SERVER:$MQTT_PORT &
node_modules/grunt/bin/grunt serve