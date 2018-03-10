FROM node:slim

WORKDIR /app
ENV MQTT_URI="ws://172.17.0.1:1884/"

ADD package.json /app

RUN npm install

ADD . /app

CMD ["/app/entrypoint.sh"]