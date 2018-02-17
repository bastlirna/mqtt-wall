FROM node:alpine

WORKDIR /app

ADD . /app

RUN npm install

EXPOSE 5000

CMD ["/app/entrypoint.sh"]