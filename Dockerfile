FROM node:slim

WORKDIR /app
ENV MQTT_SERVER mosquitto
ENV MQTT_PORT 1884

ADD . /app

RUN apt-get update && apt-get install -y socat && npm install --dev

CMD ["/app/entrypoint.sh"]