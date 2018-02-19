FROM node:alpine

WORKDIR /app
ENV MQTT_SERVER mosquitto
ENV MQTT_PORT 1884

ADD . /app

RUN apk add --update socat

EXPOSE 5000

CMD ["/app/entrypoint.sh"]